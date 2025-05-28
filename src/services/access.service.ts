import { Request } from "express";
import { AccessResult, AttemptType } from "../models/access-log.model";
import { Badge, BadgeStatus } from "../models/badge.model";
import { Device, DeviceStatus } from "../models/device.model";
import { User, UserStatus } from "../models/user.model";
import { AccessLogRepository } from "../repositories/access-log.repository";
import { BadgeRepository } from "../repositories/badge.repository";
import { ConfigurationRepository } from "../repositories/configuration.repository";
import { DeviceRepository } from "../repositories/device.repository";
import { PermissionRepository } from "../repositories/permission.repository";
import { UserRepository } from "../repositories/user.repository";
import { AccessAttempt } from "../schemas/access-attempt.schema";
import { comparePassword } from "../utils/utils";
import { connectedDevices } from "./../server";
import WebSocket from "ws";

const deviceRepository = new DeviceRepository();
const badgeRepository = new BadgeRepository();
const userRepository = new UserRepository(); 
const permissionRepository = new PermissionRepository();
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

        try {
            // 1. Vérification du dispositif
            device = await deviceRepository.getDevice(attemptData.deviceId);
            console.log({ deviceTrouver: device })
            if (!device) {
                logResult = AccessResult.echec_inconnu;
                refusalReason = "Dispositif inconnu.";
                // const log = await accessLogRepository.createAccessLog({
                //     dispositif_id: attemptData.deviceId,
                //     type_tentative: attemptData.attemptType,
                //     resultat: logResult,
                //     uid_rfid_tente: attemptData.uidRfid,
                //     adresse_ip: req.ip,
                //     details: { reason: refusalReason },
                // });
                console.error(`Tentative d'accès échouée: Dispositif inconnu ID ${attemptData.deviceId}.`)
                return { granted: false, reason: refusalReason, logId: "" };
            }

            if (device.statut !== DeviceStatus.en_ligne) {
                logResult = AccessResult.echec_inconnu;
                refusalReason = `Dispositif ${device.statut.replace("_", " ")}.`;
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

            const zoneAccesId = device.zone_acces_id;

            // 2. Vérification du badge et de l'utilisateur
            let badge: Badge | null = null;
            let userIdentifiedByAttempt = false;

            if (attemptData.attemptType === AttemptType.badge_pin) {
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
                    return { granted: false, reason: refusalReason, logId: log.id };
                }

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

                if (badge.statut !== BadgeStatus.actif) {
                    logResult = AccessResult.echec_badge;
                    refusalReason = `Badge inactif ,(${badge.statut.replace("_", " ")}).`;
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

                if (!badge.utilisateur_id) {
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
                    return { granted: false, reason: refusalReason, logId: log.id };
                }

                identifiedUser = await userRepository.getUser(badge.utilisateur_id);

                if (!identifiedUser) {
                    logResult = AccessResult.echec_inconnu;
                    refusalReason = "Utilisateur associé au badge introuvable.";
                    const log = await accessLogRepository.createAccessLog({
                        dispositif_id: attemptData.deviceId,
                        type_tentative: attemptData.attemptType,
                        resultat: logResult,
                        uid_rfid_tente: attemptData.uidRfid,
                        adresse_ip: req.ip,
                        details: { reason: refusalReason, userIdAttempted: badge.utilisateur_id },
                    });
                    return { granted: false, reason: refusalReason, logId: log.id };
                }

                userId = identifiedUser.id;
                badgeId = badge.id;
                userIdentifiedByAttempt = true;

                if (identifiedUser.statut !== UserStatus.actif) {
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

                if (identifiedUser.verrouille_jusqu && new Date() < new Date(identifiedUser.verrouille_jusqu)) {
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
                        details: { reason: refusalReason },
                    });
                    return { granted: false, reason: refusalReason, logId: log.id };
                }

                const isPinValid = await comparePassword(attemptData.pin, identifiedUser.pin_hash || '');
                if (!isPinValid) {
                    await userRepository.incrementFailedAttempts(userId);
                    const updatedUserAfterAttempt = await userRepository.getUser(userId);
                    if (updatedUserAfterAttempt) {
                        const maxAttemptsConfig = await configurationRepository.getConfigurationByKey('max_tentatives_echec');
                        const lockDurationConfig = await configurationRepository.getConfigurationByKey('duree_verrouillage_minutes');

                        if (maxAttemptsConfig && lockDurationConfig) {
                            const maxAttempts = parseInt(maxAttemptsConfig.valeur, 10);
                            const lockDurationMinutes = parseInt(lockDurationConfig.valeur, 10);

                            if (updatedUserAfterAttempt.tentatives_echec >= maxAttempts) {
                                const lockUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);
                                await userRepository.lockUser(userId, lockUntil);
                                logResult = AccessResult.echec_utilisateur_verrouille;
                                refusalReason = `Trop de tentatives échouées. Compte verrouillé jusqu'à ${lockUntil.toLocaleString()}.`;
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

                userIdentifiedByAttempt = true;
            }

            if (!userIdentifiedByAttempt || !identifiedUser || !device) {
                logResult = logResult || AccessResult.echec_inconnu;
                refusalReason = refusalReason || "Échec de l'identification de l'utilisateur ou du dispositif.";
                const log = await accessLogRepository.createAccessLog({
                    dispositif_id: device?.id || attemptData.deviceId,
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

            const hasPermission = await permissionRepository.checkUserPermission(
                identifiedUser.id,
                zoneAccesId,
            );

            if (!hasPermission) {
                logResult = AccessResult.echec_permission;
                refusalReason = "Accès non autorisé à cette zone ou hors horaires/jours autorisés.";
                const log = await accessLogRepository.createAccessLog({
                    dispositif_id: device.id,
                    type_tentative: attemptData.attemptType,
                    resultat: logResult,
                    utilisateur_id: identifiedUser.id,
                    badge_id: badgeId,
                    uid_rfid_tente: attemptData.uidRfid,
                    adresse_ip: req.ip,
                    details: { reason: refusalReason },
                });
                return { granted: false, reason: refusalReason, logId: log.id };
            }

            logResult = AccessResult.succes;
            refusalReason = undefined;

            if (identifiedUser.tentatives_echec > 0 || identifiedUser.verrouille_jusqu) {
                await userRepository.resetFailedAttempts(identifiedUser.id);
            }

            const successLog = await accessLogRepository.createAccessLog({
                dispositif_id: device.id,
                type_tentative: attemptData.attemptType,
                resultat: logResult,
                utilisateur_id: identifiedUser.id,
                badge_id: badgeId,
                uid_rfid_tente: attemptData.uidRfid,
                adresse_ip: req.ip,
                details: { message: "Accès accordé avec succès" },
            });

            // --- Ajout pour WebSocket ---
            const deviceWebSocket = connectedDevices.get(device.id);
            if (deviceWebSocket && deviceWebSocket.readyState === WebSocket.OPEN) {
                const command = { command: "open" }; // La commande à envoyer
                deviceWebSocket.send(JSON.stringify(command));
                console.log(`Commande 'open' envoyée au dispositif ${device.id} via WebSocket.`);
            } else {
                console.warn(`Dispositif ${device.id} non connecté via WebSocket. Impossible d'envoyer la commande.`);
            }
            // --- Fin de l'ajout pour WebSocket ---

            return { granted: true, reason: "Accès accordé", logId: successLog.id };

        } catch (error) {
            console.error('❌ Erreur critique dans le service d\'accès:', error);
            const log = await accessLogRepository.createAccessLog({
                dispositif_id: device?.id || attemptData.deviceId,
                type_tentative: attemptData.attemptType,
                resultat: AccessResult.echec_inconnu,
                utilisateur_id: userId,
                badge_id: badgeId,
                uid_rfid_tente: attemptData.uidRfid,
                adresse_ip: req.ip,
                details: { error: error instanceof Error ? error.message : String(error) },
            });
            return { granted: false, reason: "Erreur interne du serveur.", logId: log.id };
        }
    }
} 