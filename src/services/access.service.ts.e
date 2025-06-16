import { Request } from "express";
import { AccessResult, AttemptType } from "../models/access-log.model";
import { Badge, BadgeStatus } from "../models/badge.model";
import { Device, DeviceStatus } from "../models/device.model";
import { User, UserStatus } from "../models/user.model";
import { AccessLogRepository } from "../repositories/access-log.repository";
import { BadgeRepository } from "../repositories/badge.repository";
import { ConfigurationRepository } from "../repositories/configuration.repository";
import { DeviceRepository } from "../repositories/device.repository";
import { UserRepository } from "../repositories/user.repository";
import { AccessAttempt } from "../schemas/access-attempt.schema";
import { comparePassword } from "../utils/utils";
import { connectedDevices, unidentifiedPresentDevices } from "../server";
import WebSocket from "ws";
import { PermissionRepository } from "../repositories/permission.repository";

const deviceRepository = new DeviceRepository();
const badgeRepository = new BadgeRepository();
const userRepository = new UserRepository(); 
const accessLogRepository = new AccessLogRepository();
const configurationRepository = new ConfigurationRepository();
const permissionRepository = new PermissionRepository();


interface AccessAttemptResult {
    granted: boolean;
    reason?: string;
    logId: string;
}

// Définir une classe d'erreur personnalisée
class AccessDeniedError extends Error {
    logResult: AccessResult;
    refusalReason: string;
    details?: any;

    constructor(logResult: AccessResult, refusalReason: string, message?: string, details?: any) {
        super(message);
        this.logResult = logResult;
        this.refusalReason = refusalReason;
        this.details = details;
    }
}

export class AccessService {
    async processAttempt(attemptData: AccessAttempt, req: Request): Promise<AccessAttemptResult> {
        let userId: string | undefined;
        let badgeId: string | undefined;
        let logResult: AccessResult = AccessResult.echec_inconnu; // Initialisation par défaut
        let refusalReason: string | undefined; // Initialisation par défaut
        let identifiedUser: User | null = null;
        let device: Device | null = null;
        let zoneAccesId: string | undefined;
        let badge: Badge | null = null;
        let actionneurDevice: Device | null = null;

        try {
            // 1. Vérification du dispositif lecteur
            device = await this.checkDevice(attemptData, req);
            zoneAccesId = device.zone_acces_id;

            // Si la tentative est de type badge_pin, on procède à la validation du badge/PIN et à la commande de l'actionneur
            if (attemptData.attemptType === AttemptType.badge_pin) {
                // 2. vérification du badge et du PIN
                badge = await this.checkBadgeAndPin(attemptData, req);
                badgeId = badge.id;

                // 3. vérification du statut du badge
                this.checkBadgeStatus(badge);

                // 4. vérification de l'attribution du badge
                this.checkBadgeAssignment(badge);

                // 5. vérification de l'identification de l'utilisateur
                identifiedUser = await this.checkUserIdentification(badge);
                userId = identifiedUser.id;

                // 6. vérification si l'utilisateur est actif
                this.checkUserActive(identifiedUser);

                // 7. vérification si l'utilisateur est verrouillé
                this.checkUserLocked(identifiedUser);

                // 8. vérification de la validité du PIN
                await this.checkPinValidity(identifiedUser, attemptData);

                // 9. réinitialiser les tentatives échouées
                await this.resetFailedAttempts(identifiedUser);

                // 9.5. Vérification des permissions de l'utilisateur pour la zone
                await this.checkUserPermissionsForZone(identifiedUser.id, zoneAccesId);

                // 10. Trouver l'actionneur associé à la zone d'accès
                actionneurDevice = await this.findActionneurByZoneId(zoneAccesId);

                // 11. Envoyer la commande d'ouverture à l'actionneur
                return await this.sendOpenCommand(identifiedUser, badge, actionneurDevice, attemptData, req);
            }

            // Si le type de tentative n'est pas géré ou si on atteint ce point de manière inattendue
            logResult = AccessResult.echec_inconnu;
            refusalReason = `Type de tentative non géré ou erreur interne: ${attemptData.attemptType}.`;
            const log = await accessLogRepository.createAccessLog({
                dispositif_id: attemptData.deviceId,
                type_tentative: attemptData.attemptType,
                resultat: logResult,
                utilisateur_id: userId,
                badge_id: badgeId,
                uid_rfid_tente: attemptData.uidRfid,
                adresse_ip: req.ip,
                details: { reason: refusalReason },
            });
            return { granted: false, reason: refusalReason, logId: log.id };

        } catch (error) {
            // Gérer les erreurs, y compris les AccessDeniedError
            if (error instanceof AccessDeniedError) {
                logResult = error.logResult;
                refusalReason = error.refusalReason;
                console.error(`Tentative d'accès échouée pour dispositif ${attemptData.deviceId}: ${refusalReason}`);
                try {
                    const log = await accessLogRepository.createAccessLog({
                        dispositif_id: attemptData.deviceId,
                        type_tentative: attemptData.attemptType,
                        resultat: logResult,
                        utilisateur_id: userId,
                        badge_id: badgeId,
                        uid_rfid_tente: attemptData.uidRfid,
                        adresse_ip: req.ip,
                        details: { ...error.details, reason: refusalReason },
                    });
                    return { granted: false, reason: refusalReason, logId: log.id };
                } catch (logErr: any) {
                    console.error("Erreur lors de la création du log pour accès refusé:", logErr);
                    return { granted: false, reason: refusalReason, logId: "" };
                }
            } else {
                console.error("Erreur inattendue lors du traitement de la tentative:", error);
                logResult = AccessResult.erreur_interne;
                refusalReason = "Erreur interne du serveur.";
                const log = await accessLogRepository.createAccessLog({
                    dispositif_id: attemptData.deviceId,
                    type_tentative: attemptData.attemptType,
                    resultat: logResult,
                    utilisateur_id: userId,
                    badge_id: badgeId,
                    uid_rfid_tente: attemptData.uidRfid,
                    adresse_ip: req.ip,
                    details: { error: error instanceof Error ? error.message : "Une erreur inconnue est survenue." },
                });
                return { granted: false, reason: refusalReason, logId: log.id };
            }
        }
    }


// 1. vérification du dispositif lecteur
async checkDevice(attemptData: AccessAttempt, req: Request): Promise<Device> {
    const device = await deviceRepository.getDevice(attemptData.deviceId);
    console.log({ deviceTrouver: device });

    if (!device) {
        throw new AccessDeniedError(AccessResult.echec_inconnu, `Dispositif lecteur inconnu ID ${attemptData.deviceId}.`, `Tentative d'accès échouée: Dispositif lecteur inconnu ID ${attemptData.deviceId}.`);
    }

    if (device.statut !== DeviceStatus.en_ligne) {
        throw new AccessDeniedError(AccessResult.echec_inconnu, `Dispositif lecteur ${device.statut.replace("_", " ")}.`, `Dispositif inactif: ${device.id}`, { deviceStatus: device.statut });
    }

    return device;
}

// 2. Vérification du badge et de code PIN
async checkBadgeAndPin(attemptData: AccessAttempt, req: Request): Promise<Badge> {
    // vérification du PIN
    if (!attemptData.pin) {
        throw new AccessDeniedError(AccessResult.echec_pin, "PIN MANQUANT", "PIN manquant");
    }

    // vérification du badge
    if (!attemptData.uidRfid) {
        throw new AccessDeniedError(AccessResult.echec_badge, "UID BADGE MANQUANT", "Badge manquant");
    }

    const badge = await badgeRepository.getBadgeByUidRfid(attemptData.uidRfid);

    console.log({ badge_uid: attemptData.uidRfid, badge });
    if (!badge) {
        throw new AccessDeniedError(AccessResult.echec_badge, "Badge inconnu.", "Badge inconnu");
    }

    return badge;
}

// 3. vérification le statut du badge
checkBadgeStatus(badge: Badge): void {
    if (badge.statut !== BadgeStatus.actif) {
        throw new AccessDeniedError(AccessResult.echec_badge, `Badge inactif (${badge.statut.replace("_", " ")}).`, `Badge inactif: ${badge.id}`, { badgeStatus: badge.statut });
    }
}

// 4.vérification si le badge est assigné à un utilisateur
checkBadgeAssignment(badge: Badge): void {
    if (!badge.utilisateur_id) {
        throw new AccessDeniedError(AccessResult.echec_badge, "BADGE NON ASSIGNEE", "Badge non assigné");
    }
}

// 5. vérification si l'utilisateur est identifié
async checkUserIdentification(badge: Badge): Promise<User> {
    const identifiedUser = await userRepository.getUser(badge.utilisateur_id as string);
    if (!identifiedUser) {
        throw new AccessDeniedError(AccessResult.echec_inconnu, "Utilisateur associé au badge introuvable.", `Utilisateur introuvable pour badge ${badge.id}`, { userIdAttempted: badge.utilisateur_id });
    }
    return identifiedUser;
}

// 6.vérification si l'utilisateur est actif
checkUserActive(identifiedUser: User): void {
    if (identifiedUser.statut !== UserStatus.actif) {
        throw new AccessDeniedError(AccessResult.echec_utilisateur_inactif, "Utilisateur inactif", `Utilisateur inactif: ${identifiedUser.id}`);
    }
}

// 7. vérification si l'utilisateur est verrouillé
checkUserLocked(identifiedUser: User): void {
    if (identifiedUser.verrouille_jusqu && new Date() < new Date(identifiedUser.verrouille_jusqu)) {
        throw new AccessDeniedError(AccessResult.echec_utilisateur_verrouille, `Utilisateur verrouillé jusqu'à ${new Date(identifiedUser.verrouille_jusqu).toLocaleString()}.`, `Utilisateur verrouillé: ${identifiedUser.id}`, { lockedUntil: identifiedUser.verrouille_jusqu });
    }
}

// 8. vérification de la validité du PIN fourni
async checkPinValidity(identifiedUser: User, attemptData: AccessAttempt): Promise<void> {
    const isPinValid = await comparePassword(attemptData?.pin!, identifiedUser!.pin_hash || '');
    const userId = identifiedUser.id;

    // Si le PIN est invalide
    if (!isPinValid) {
        // Incrémenter le compteur de tentatives échouées pour l'utilisateur
        await userRepository.incrementFailedAttempts(userId);

        // Récupérer les informations mises à jour de l'utilisateur
        const updatedUserAfterAttempt = await userRepository.getUser(userId);

        if (updatedUserAfterAttempt) {
            // Récupérer les configurations de sécurité depuis la base de données
            const maxAttemptsConfig = await configurationRepository.getConfigurationByKey('max_tentatives_echec');
            const lockDurationConfig = await configurationRepository.getConfigurationByKey('duree_verrouillage_minutes');

            // Vérifier que les configurations sont disponibles
            if (maxAttemptsConfig && lockDurationConfig) {
                // Convertir les valeurs de configuration en nombres
                const maxAttempts = parseInt(maxAttemptsConfig.valeur, 10);
                const lockDurationMinutes = parseInt(lockDurationConfig.valeur, 10);

                // Vérifier si le nombre maximum de tentatives est atteint
                if (updatedUserAfterAttempt.tentatives_echec >= maxAttempts) {
                    // Calculer la date de déverrouillage
                    const lockUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);

                    // Verrouiller le compte de l'utilisateur
                    await userRepository.lockUser(userId, lockUntil);

                    // Définir le résultat et le message de refus
                    throw new AccessDeniedError(AccessResult.echec_utilisateur_verrouille, `Trop de tentatives échouées. Compte verrouillé jusqu'à ${lockUntil.toLocaleString()}.`, `Compte utilisateur verrouillé: ${userId}`, { attempts: updatedUserAfterAttempt.tentatives_echec, lockedUntil: lockUntil });
                }
            }
        }

        // Si le compte n'est pas verrouillé après cette tentative
        throw new AccessDeniedError(AccessResult.echec_pin, "PIN incorrect", `PIN incorrect pour utilisateur ${userId}`);
    }
}

// 9. réinitialiser les tentatives échouées
async resetFailedAttempts(identifiedUser: User): Promise<void> {
    const userId = identifiedUser.id;
    if (identifiedUser.tentatives_echec > 0) {
        await userRepository.resetFailedAttempts(userId);
    }
}

// 9.5. Vérification des permissions de l'utilisateur pour la zone
async checkUserPermissionsForZone(userId: string, zoneId: string | undefined): Promise<void> {
    if (!zoneId) {
        // Ceci ne devrait pas arriver si checkDevice a réussi, mais par sécurité
        throw new AccessDeniedError(AccessResult.echec_dispositif_introuvable, "Zone d'accès non définie pour le dispositif lecteur.", "Zone d'accès non définie.");
    }

    const hasPermission = await permissionRepository.checkUserPermission(userId, zoneId);

    if (!hasPermission) {
        throw new AccessDeniedError(AccessResult.echec_permission, "Permission refusée pour cette zone à cet instant.", `Accès refusé: utilisateur ${userId} n'a pas de permission valide pour la zone ${zoneId}.`);
    }
}

// 10. Trouver l'actionneur associé à la zone d'accès
async findActionneurByZoneId(zoneAccesId: string | undefined): Promise<Device> {
    if (!zoneAccesId) {
         throw new AccessDeniedError(AccessResult.echec_dispositif_introuvable, "Zone d'accès non définie pour le dispositif lecteur.", "Zone d'accès non définie pour le dispositif lecteur.");
    }
    const actionneurDevice = await deviceRepository.getActionneurByZoneId(zoneAccesId);

    if (!actionneurDevice) {
        throw new AccessDeniedError(AccessResult.echec_dispositif_introuvable, `Actionneur associé à la zone ${zoneAccesId} introuvable.`, `Actionneur introuvable pour zone d'accès: ${zoneAccesId}`, { zoneAccesId: zoneAccesId });
    }
    return actionneurDevice;
}

// 11. Envoyer la commande d'ouverture à l'actionneur
async sendOpenCommand(identifiedUser: User|null, badge: Badge|null, actionneurDevice: Device, attemptData: AccessAttempt, req: Request): Promise<AccessAttemptResult> {
    const userId = identifiedUser?.id;
    const badgeId = badge?.id;
    const actionneurMacAddress = actionneurDevice.mac_address;

    // Fonction pour créer un journal d'accès
    const createAccessLog = async (result: AccessResult, reason?: string, details: any = {}) => {
        const log = await accessLogRepository.createAccessLog({
            dispositif_id: attemptData.deviceId,
            type_tentative: attemptData.attemptType,
            resultat: result,
            utilisateur_id: userId,
            badge_id: badgeId,
            uid_rfid_tente: attemptData.uidRfid,
            adresse_ip: req.ip,
            details: { ...details, actionneurMac: actionneurMacAddress, ...(reason && { reason }) },
        });
        return { granted: result === AccessResult.succes, reason, logId: log.id };
    };

    // Fonction pour envoyer une commande au websocket
    const sendCommand = async (ws: WebSocket, message: any) => {
        try {
            ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error(`Erreur lors de l'envoi de la commande à l'actionneur ${actionneurMacAddress}:`, error);
            return false;
        }
    };

    // Essayer d'envoyer une commande au dispositif identifié
    let actionneurWs = connectedDevices.get(actionneurMacAddress);
    if (actionneurWs?.readyState === WebSocket.OPEN) {
        console.log(`Actionneur ${actionneurMacAddress} trouvé dans les dispositifs identifiés.`);
        if (await sendCommand(actionneurWs, { command: 'open', angle: 0 })) {
            return createAccessLog(AccessResult.succes);
        }
        return createAccessLog(AccessResult.echec_communication_dispositif, "Erreur de communication avec l'actionneur.");
    }

    // Essayer d'identifier et d'envoyer une commande au dispositif non identifié
    const actionneurWsUnidentified = unidentifiedPresentDevices.get(actionneurMacAddress);
    if (actionneurWsUnidentified?.readyState === WebSocket.OPEN) {
        console.log(`Actionneur ${actionneurMacAddress} trouvé dans les présences non identifiées.`);

        if (!await sendCommand(actionneurWsUnidentified, { type: 'triggerIdentification' })) {
            return createAccessLog(AccessResult.echec_communication_dispositif, "Erreur lors de l'envoi du déclencheur à l'actionneur.");
        }

        // Attendre un court instant pour l'identification
        await new Promise(resolve => setTimeout(resolve, 200));

        // Vérifier à nouveau si l'actionneur est maintenant identifié
        actionneurWs = connectedDevices.get(actionneurMacAddress);
        if (actionneurWs?.readyState === WebSocket.OPEN) {
            if (await sendCommand(actionneurWs, { command: 'open', angle: 0 })) {
                return createAccessLog(AccessResult.succes);
            }
            return createAccessLog(AccessResult.echec_communication_dispositif, "Erreur de communication avec l'actionneur après identification.");
        }

        return createAccessLog(AccessResult.echec_identification_dispositif, "Actionneur non identifié à temps.");
    }

    // Si l'actionneur n'est trouvé ni dans les dispositifs identifiés ni dans les présences non identifiées
    return createAccessLog(AccessResult.echec_dispositif_hors_ligne, "Actionneur non connecté ou non détecté.");
}

}