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

const deviceRepository = new DeviceRepository();
const badgeRepository = new BadgeRepository();
const userRepository = new UserRepository(); 
const accessLogRepository = new AccessLogRepository();
const configurationRepository = new ConfigurationRepository();


interface AccessAttemptResult {
    granted: boolean;
    reason?: string;
    logId: string;
}

export class AccessService {
    async processAttempt(attemptData: AccessAttempt, req: Request): Promise<AccessAttemptResult> {
        let userId: string | undefined;
        let badgeId: string | undefined;
        let logResult: AccessResult = AccessResult.echec_inconnu;
        let refusalReason: string | undefined;
        let identifiedUser: User | null = null;
        let device: Device | null = null;
        let zoneAccesId: string | undefined;
        let badge: Badge | null = null;
        let actionneurDevice: Device | null = null;


        try {
            // 1. Vérification du dispositif lecteur
           await checkDevice(device, attemptData, req, logResult, refusalReason, zoneAccesId);

            // Si la tentative est de type badge_pin, on procède à la validation du badge/PIN
            if (attemptData.attemptType === AttemptType.badge_pin) {

                // --- Début de la validation du badge/PIN ---

                // 2. vérification du badge et du PIN
                await checkBadgeAndPin(badge, attemptData, req, logResult, refusalReason);
                // 3. vérification du statut du badge
                await checkBadgeStatus(badge, attemptData, req, logResult, refusalReason);
                // 4. vérification de l'attribution du badge
                await checkBadgeAssignment(badge, attemptData, req, logResult, refusalReason);
                // 5. vérification de l'identification de l'utilisateur
                await checkUserIdentification(badge, attemptData, req, logResult, refusalReason, identifiedUser);
                // 6. vérification si l'utilisateur est actif
                await checkUserActive(badge, identifiedUser, attemptData, req, logResult, refusalReason);
                // 7. vérification si l'utilisateur est verrouillé
                await checkUserLocked(badge, identifiedUser, attemptData, req, logResult, refusalReason);
                // 8. vérification de la validité du PIN
                await checkPinValidity(badge, identifiedUser, attemptData, req, logResult, refusalReason);
                // 9. réinitialiser les tentatives échouées
                await resetFailedAttempts(badge, identifiedUser, attemptData, req, logResult, refusalReason);

                // --- Fin de la validation du badge/PIN ---

                // --- Début de la logique pour trouver l'actionneur et envoyer les commandes ---

                // 10. Trouver l'actionneur associé à la zone d'accès
                await findActionneurByZoneId(badge, identifiedUser, device, attemptData, req, logResult, refusalReason, actionneurDevice);
                // 11. Envoyer la commande d'ouverture à l'actionneur
                await sendOpenCommand(badge, identifiedUser, actionneurDevice, attemptData, req, logResult, refusalReason);
                
                // --- Fin de la logique pour trouver l'actionneur et envoyer les commandes ---

            } 


            // Si on arrive ici pour badge_pin, cela signifie que la validation du badge/PIN a réussi
            // mais la logique de l'actionneur n'a pas encore retourné de résultat.
            // Ceci ne devrait pas arriver avec la structure actuelle où la logique de l'actionneur retourne directement le résultat.
            console.error("Reached unexpected point in processAttempt for badge_pin.");
            logResult = AccessResult.echec_inconnu;
            refusalReason = "Erreur interne après validation.";
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
            console.error("Erreur inattendue lors du traitement de la tentative:", error);
            if (error instanceof Error) {
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
                details: { error: error.message },
            });
            return { granted: false, reason: refusalReason, logId: log.id };
            }
            return { granted: false, reason: refusalReason, logId: "null" };
        }
    }

} 


//1. vérification du dispositif lecteur
async function checkDevice(device: Device|null, attemptData: AccessAttempt, req: Request, logResult: AccessResult, refusalReason: string|undefined, zoneAccesId: string|undefined) {
    device = await deviceRepository.getDevice(attemptData.deviceId);
    console.log({ deviceTrouver: device })
    if (!device) {
        logResult = AccessResult.echec_inconnu;
        refusalReason = "Dispositif lecteur inconnu.";
        console.error(`Tentative d'accès échouée: Dispositif lecteur inconnu ID ${attemptData.deviceId}.`)
        try {
            const log = await accessLogRepository.createAccessLog({
                dispositif_id: attemptData.deviceId,
                type_tentative: attemptData.attemptType,
                resultat: logResult,
                uid_rfid_tente: attemptData.uidRfid,
                adresse_ip: req.ip,
                details: { reason: refusalReason },
            });

            console.log(`Dispositif inconnu: ${log.id}`)
            return { granted: false, reason: refusalReason, logId: log.id };
        } catch (logErr: any) {
            console.error("Erreur lors de la création du log pour dispositif inconnu:", logErr);
            return { granted: false, reason: refusalReason, logId: "" };
        }
    }

    if (device.statut !== DeviceStatus.en_ligne) {
        logResult = AccessResult.echec_inconnu;
        refusalReason = `Dispositif lecteur ${device.statut.replace("_", " ")}.`;
        const log = await accessLogRepository.createAccessLog({
            dispositif_id: attemptData.deviceId,
            type_tentative: attemptData.attemptType,
            resultat: logResult,
            uid_rfid_tente: attemptData.uidRfid,
            adresse_ip: req.ip,
            details: { reason: refusalReason, deviceStatus: device.statut },
        });
        console.log(`Dispositif inactif: ${log.id}`)
        return { granted: false, reason: refusalReason, logId: log.id };
    }

    zoneAccesId = device.zone_acces_id;
}

// 2. Vérification du badge et de code PIN
async function checkBadgeAndPin(badge: Badge|null, attemptData: AccessAttempt, req: Request, logResult: AccessResult, refusalReason: string|undefined) {
    // vérification du PIN
    if (!attemptData.pin) {
        logResult = AccessResult.echec_pin;
        refusalReason = "PIN MANQUANT";
        const log = await accessLogRepository.createAccessLog({
            dispositif_id: attemptData.deviceId,
            type_tentative: attemptData.attemptType,
            resultat: logResult,
            uid_rfid_tente: attemptData.uidRfid,
            adresse_ip: req.ip,
            details: { reason: refusalReason },
        });
        console.log(`PIN manquant: ${log.id}`)
        return { granted: false, reason: refusalReason, logId: log.id };
    }

    // vérification du badge
    if (!attemptData.uidRfid) {
        logResult = AccessResult.echec_badge;
        refusalReason = "UID BADGE MANQUANT";
        const log = await accessLogRepository.createAccessLog({
            dispositif_id: attemptData.deviceId,
            type_tentative: attemptData.attemptType,
            resultat: logResult,
            uid_rfid_tente: attemptData.uidRfid,
            adresse_ip: req.ip,
            details: { reason: refusalReason },
        });
        console.log(`Badge manquant: ${log.id}`)
        return { granted: false, reason: refusalReason, logId: log.id };
    }

    badge = await badgeRepository.getBadgeByUidRfid(attemptData.uidRfid);

    console.log({ badge_uid:attemptData.uidRfid, badge })
    if (!badge) {
        logResult = AccessResult.echec_badge;
        refusalReason = "Badge inconnu.";
        const log = await accessLogRepository.createAccessLog({
            dispositif_id: attemptData.deviceId,
            type_tentative: attemptData.attemptType,
            resultat: logResult,
            uid_rfid_tente: attemptData.uidRfid,
            adresse_ip: req.ip,
            details: { reason: refusalReason },
        });
        return { granted: false, reason: refusalReason, logId: log.id };
    }
    
}

// 3. vérification le statut du badge
async function checkBadgeStatus(badge: Badge|null, attemptData: AccessAttempt, req: Request, logResult: AccessResult, refusalReason: string|undefined) {
    // vérification du statut du badge
    if (badge!.statut !== BadgeStatus.actif) {
        logResult = AccessResult.echec_badge;
        refusalReason = `Badge inactif ,(${badge!.statut.replace("_", " ")}).`;
        const log = await accessLogRepository.createAccessLog({
            dispositif_id: attemptData.deviceId,
            type_tentative: attemptData.attemptType,
            resultat: logResult,
            uid_rfid_tente: attemptData.uidRfid,
            adresse_ip: req.ip,
            details: { reason: refusalReason, badgeStatus: badge!.statut },
        });
        console.log(`Badge inactif: ${log.id}`)
        return { granted: false, reason: refusalReason, logId: log.id };
    }
}

// 4.vérification si le badge est assigné à un utilisateur
async function checkBadgeAssignment(badge: Badge|null, attemptData: AccessAttempt, req: Request, logResult: AccessResult, refusalReason: string|undefined) {
    if (!badge!.utilisateur_id) {
        logResult = AccessResult.echec_badge;
        refusalReason = "BADGE NON ASSIGNEE";
        const log = await accessLogRepository.createAccessLog({
            dispositif_id: attemptData.deviceId,
            type_tentative: attemptData.attemptType,
            resultat: logResult,
            uid_rfid_tente: attemptData.uidRfid,
            adresse_ip: req.ip,
            details: { reason: refusalReason },
        });
        console.log(`Badge non assigné: ${log.id}`)
        return { granted: false, reason: refusalReason, logId: log.id };
    }
}

// 5. vérification si l'utilisateur est identifié
async function checkUserIdentification(badge: Badge|null, attemptData: AccessAttempt, req: Request, logResult: AccessResult, refusalReason: string|undefined, identifiedUser: User|null) {
    identifiedUser = await userRepository.getUser(badge!.utilisateur_id as string);
    if (!identifiedUser) {
        logResult = AccessResult.echec_inconnu;
        refusalReason = "Utilisateur associé au badge introuvable.";
        const log = await accessLogRepository.createAccessLog({
            dispositif_id: attemptData.deviceId,
            type_tentative: attemptData.attemptType,
            resultat: logResult,
            uid_rfid_tente: attemptData.uidRfid,
            adresse_ip: req.ip,
            details: { reason: refusalReason, userIdAttempted: badge!.utilisateur_id },
        });
        console.log(`Utilisateur introuvable: ${log.id}`)
        return { granted: false, reason: refusalReason, logId: log.id };
    }
}

// 6.vérification si l'utilisateur est actif
async function checkUserActive(badge: Badge|null, identifiedUser: User|null, attemptData: AccessAttempt, req: Request, logResult: AccessResult, refusalReason: string|undefined) {
    const userId = identifiedUser!.id;
    const badgeId = badge!.id;
    if (identifiedUser?.statut !== UserStatus.actif) {
        logResult = AccessResult.echec_utilisateur_inactif;
        refusalReason = "Utilisateur inactif";
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
    }
}

// 7. vérification si l'utilisateur est verrouillé
async function checkUserLocked(badge: Badge|null, identifiedUser: User|null, attemptData: AccessAttempt, req: Request, logResult: AccessResult, refusalReason: string|undefined) {
    const userId = identifiedUser!.id;
    const badgeId = badge!.id;
    if (identifiedUser?.verrouille_jusqu && new Date() < new Date(identifiedUser.verrouille_jusqu)) {
        logResult = AccessResult.echec_utilisateur_verrouille;
        refusalReason = `Utilisateur verrouillé jusqu'à ${new Date(identifiedUser.verrouille_jusqu).toLocaleString()}.`;
        const log = await accessLogRepository.createAccessLog({
            dispositif_id: attemptData.deviceId,
            type_tentative: attemptData.attemptType,
            resultat: logResult,
            utilisateur_id: userId,
            badge_id: badgeId,
            uid_rfid_tente: attemptData.uidRfid,
            adresse_ip: req.ip,
            details: { reason: refusalReason, lockedUntil: identifiedUser.verrouille_jusqu },
        });
        return { granted: false, reason: refusalReason, logId: log.id };
    }
}
   
// 8. vérification de la validité du PIN fourni
async function checkPinValidity(badge: Badge|null, identifiedUser: User|null, attemptData: AccessAttempt, req: Request, logResult: AccessResult, refusalReason: string|undefined) {
    const userId = identifiedUser!.id;
    const badgeId = badge!.id;
    const isPinValid = await comparePassword(attemptData?.pin!, identifiedUser!.pin_hash || '');
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
                    logResult = AccessResult.echec_utilisateur_verrouille;
                    refusalReason = `Trop de tentatives échouées. Compte verrouillé jusqu'à ${lockUntil.toLocaleString()}.`;
                    
                    // Créer un journal d'accès pour cette tentative
                    const log = await accessLogRepository.createAccessLog({
                        dispositif_id: attemptData.deviceId,
                        type_tentative: attemptData.attemptType,
                        resultat: logResult,
                        utilisateur_id: userId,
                        badge_id: badgeId,
                        uid_rfid_tente: attemptData.uidRfid,
                        adresse_ip: req.ip,
                        details: { reason: refusalReason, attempts: updatedUserAfterAttempt.tentatives_echec },
                    });
                    
                    // Retourner le résultat du refus d'accès
                    return { granted: false, reason: refusalReason, logId: log.id };
                }
            }
        }

        logResult = AccessResult.echec_pin;
        refusalReason = "PIN incorrect";
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
    }

}

// 9. réinitialiser les tentatives échouées
async function resetFailedAttempts(badge: Badge|null, identifiedUser: User|null, attemptData: AccessAttempt, req: Request, logResult: AccessResult, refusalReason: string|undefined) {
    const userId = identifiedUser!.id;
    await userRepository.resetFailedAttempts(userId);
}

// 10. Trouver l'actionneur associé à la zone d'accès
async function findActionneurByZoneId(badge: Badge|null, identifiedUser: User|null, device: Device|null, attemptData: AccessAttempt, req: Request, logResult: AccessResult, refusalReason: string|undefined, actionneurDevice: Device|null) {
    const userId = identifiedUser!.id;
    const badgeId = badge!.id;
    const zoneAccesId = device!.zone_acces_id;
    actionneurDevice = await deviceRepository.getActionneurByZoneId(zoneAccesId);
    // console.log({actionneurDevice})
    if (!actionneurDevice) {
        logResult = AccessResult.echec_dispositif_introuvable;
        refusalReason = "Actionneur associé à la zone introuvable.";
        const log = await accessLogRepository.createAccessLog({
            dispositif_id: attemptData.deviceId,
            type_tentative: attemptData.attemptType,
            resultat: logResult,
            utilisateur_id: userId,
            badge_id: badgeId,
            uid_rfid_tente: attemptData.uidRfid,
            adresse_ip: req.ip,
            details: { reason: refusalReason, zoneAccesId: zoneAccesId },
        });

        return { granted: false, reason: refusalReason, logId: log.id };
    }

}

// 11. Envoyer la commande d'ouverture à l'actionneur
async function sendOpenCommand(badge: Badge|null, identifiedUser: User|null, actionneurDevice: Device|null, attemptData: AccessAttempt, req: Request, logResult: AccessResult, refusalReason: string|undefined) {
    const userId = identifiedUser!.id;
    const badgeId = badge!.id;
    const actionneurMacAddress = actionneurDevice!.mac_address;
    let actionneurWs = connectedDevices.get(actionneurMacAddress);

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

        await new Promise(resolve => setTimeout(resolve, 200));
        actionneurWs = connectedDevices.get(actionneurMacAddress);

        if (actionneurWs?.readyState === WebSocket.OPEN) {
            if (await sendCommand(actionneurWs, { command: 'open', angle: 0 })) {
                return createAccessLog(AccessResult.succes);
            }
            return createAccessLog(AccessResult.echec_communication_dispositif, "Erreur de communication avec l'actionneur.");
        }
        
        return createAccessLog(AccessResult.echec_identification_dispositif, "Actionneur non identifié à temps.");
    }

    return createAccessLog(AccessResult.echec_dispositif_hors_ligne, "Actionneur non connecté ou non détecté.");
}
