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
import { connectedDevices, unidentifiedPresentDevices } from "./../server";
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
            // 1. Vérification du dispositif LECTEUR
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
                        details: { reason: refusalReason, badgeStatus: badge.statut },
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
                        details: { reason: refusalReason, lockedUntil: identifiedUser.verrouille_jusqu },
                    });
                    return { granted: false, reason: refusalReason, logId: log.id };
                }

                // Vérification de la validité du PIN fourni
                const isPinValid = await comparePassword(attemptData.pin, identifiedUser.pin_hash || '');
                
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

                // Si le PIN est valide, réinitialiser les tentatives échouées
                await userRepository.resetFailedAttempts(userId);

                // --- Fin de la validation du badge/PIN ---

                // --- Début de la logique pour trouver l'actionneur et envoyer les commandes ---

                // TODO: Ici, la logique doit trouver le dispositif ACTIONNEUR associé à la zone d'accès (zoneAccesId) 
                // par exemple, en le cherchant dans la base de données. Nous supposons que cette étape est faite 
                // et que vous avez l'objet `actionneurDevice` avec son `mac_address`.
                
                // Exemple fictif : Simuler la récupération de l'actionneur associé à la zone d'accès
                // Vous devez remplacer ceci par votre vraie logique de base de données.
                const actionneurDevice = await deviceRepository.getActionneurByZoneId(zoneAccesId);
                console.log({actionneurDevice})
                if (!actionneurDevice) {
                    logResult = AccessResult.echec_actionneur_introuvable;
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

                // Vérifier si l'actionneur trouvé est bien de type 'actionneur' (si votre modèle de Device a un type)
                // if (actionneurDevice.type !== DeviceType.actionneur) { ... gérer l'erreur ... }

                const actionneurMacAddress = actionneurDevice.mac_address;

                console.log(actionneurMacAddress)

                // --- Logique pour trouver la connexion WebSocket de l'actionneur et envoyer les commandes ---

                // 3. Tenter de trouver la connexion WebSocket de l'actionneur dans les dispositifs *identifiés* en premier
                let actionneurWs = connectedDevices.get(actionneurMacAddress);

                if (actionneurWs && actionneurWs.readyState === WebSocket.OPEN) {
                    console.log(`Actionneur ${actionneurMacAddress} trouvé dans les dispositifs identifiés. Envoi direct de la commande d'accès.`);

                    // 4. Envoyer la commande d'ouverture à l'actionneur identifié
                    try {
                        const commandMessage = JSON.stringify({ command: 'open', angle: 0 }); // Exemple: ouvrir la porte (angle 0)
                        actionneurWs.send(commandMessage);
                        console.log('Commande setAngle 0 envoyée à ' + actionneurMacAddress);

                        // --- Gérer le succès de l'accès ---
                        logResult = AccessResult.succes;
                        refusalReason = undefined; // Pas de raison de refus en cas de succès

                        const log = await accessLogRepository.createAccessLog({
                            dispositif_id: attemptData.deviceId, // Le lecteur
                            type_tentative: attemptData.attemptType,
                            resultat: logResult,
                            utilisateur_id: userId,
                            badge_id: badgeId,
                            uid_rfid_tente: attemptData.uidRfid,
                            adresse_ip: req.ip,
                            details: { actionneurMac: actionneurMacAddress }, // Ajouter l'info de l'actionneur
                        });
                        console.log(`Accès accordé pour utilisateur ${userId} via dispositif ${attemptData.deviceId}. Log ID: ${log.id}`);
                        return { granted: true, logId: log.id };

                    } catch (sendCmdErr: any) { // Type l'erreur
                        console.error(`Erreur lors de l'envoi de la commande à l'actionneur ${actionneurMacAddress}:`, sendCmdErr);
                        logResult = AccessResult.echec_communication_actionneur;
                        refusalReason = "Erreur de communication avec l'actionneur.";
                        const log = await accessLogRepository.createAccessLog({
                            dispositif_id: attemptData.deviceId,
                            type_tentative: attemptData.attemptType,
                            resultat: logResult,
                            utilisateur_id: userId,
                            badge_id: badgeId,
                            uid_rfid_tente: attemptData.uidRfid,
                            adresse_ip: req.ip,
                            details: { reason: refusalReason, actionneurMac: actionneurMacAddress, error: sendCmdErr.message },
                        });
                        return { granted: false, reason: refusalReason, logId: log.id };
                    }

                } else { // Si l'actionneur n'est pas dans les dispositifs identifiés, chercher dans les présences non identifiées
                    console.log(`Actionneur ${actionneurMacAddress} non trouvé dans les dispositifs identifiés. Recherche dans les présences non identifiées.`);
                    const actionneurWsUnidentified = unidentifiedPresentDevices.get(actionneurMacAddress);

                    if (actionneurWsUnidentified && actionneurWsUnidentified.readyState === WebSocket.OPEN) {
                        console.log(`Actionneur ${actionneurMacAddress} trouvé dans les présences non identifiées. Envoi du trigger d'identification.`);
                        // Envoyer le message de déclenchement de l'identification
                        try {
                            const triggerMessage = JSON.stringify({ type: 'triggerIdentification' });
                            actionneurWsUnidentified.send(triggerMessage);
                            console.log('Message de déclenchement d\'identification envoyé à ' + actionneurMacAddress);

                            // --- Attendre l'identification et envoyer la commande (approche simplifiée) ---
                            // Attendre un court instant pour laisser l'ESP32 s'identifier.
                            await new Promise(resolve => setTimeout(resolve, 200)); // Ajustez si nécessaire.

                            // Tenter de trouver la connexion maintenant dans les dispositifs *identifiés*
                            actionneurWs = connectedDevices.get(actionneurMacAddress); // Réutiliser la variable actionneurWs

                            if (actionneurWs && actionneurWs.readyState === WebSocket.OPEN) {
                                console.log(`Actionneur ${actionneurMacAddress} identifié après trigger. Envoi de la commande d'accès.`);

                                // 4. Envoyer la commande d'ouverture à l'actionneur identifié
                                try {
                                    const commandMessage = JSON.stringify({ command: 'open', angle: 0 });
                                    actionneurWs.send(commandMessage);
                                    console.log('Commande setAngle 0 envoyée à ' + actionneurMacAddress);

                                    // --- Gérer le succès de l'accès ---
                                    logResult = AccessResult.succes;
                                    refusalReason = undefined;

                                    const log = await accessLogRepository.createAccessLog({
                                        dispositif_id: attemptData.deviceId,
                                        type_tentative: attemptData.attemptType,
                                        resultat: logResult,
                                        utilisateur_id: userId,
                                        badge_id: badgeId,
                                        uid_rfid_tente: attemptData.uidRfid,
                                        adresse_ip: req.ip,
                                        details: { actionneurMac: actionneurMacAddress },
                                    });
                                    console.log(`Accès accordé pour utilisateur ${userId} via dispositif ${attemptData.deviceId}. Log ID: ${log.id}`);
                                    return { granted: true, logId: log.id };

                                } catch (sendCmdErr: any) {
                                    console.error(`Erreur lors de l'envoi de la commande à l'actionneur ${actionneurMacAddress}:`, sendCmdErr);
                                    logResult = AccessResult.echec_communication_actionneur;
                                    refusalReason = "Erreur de communication avec l'actionneur.";
                                    const log = await accessLogRepository.createAccessLog({
                                        dispositif_id: attemptData.deviceId,
                                        type_tentative: attemptData.attemptType,
                                        resultat: logResult,
                                        utilisateur_id: userId,
                                        badge_id: badgeId,
                                        uid_rfid_tente: attemptData.uidRfid,
                                        adresse_ip: req.ip,
                                        details: { reason: refusalReason, actionneurMac: actionneurMacAddress, error: sendCmdErr.message },
                                    });
                                    return { granted: false, reason: refusalReason, logId: log.id };
                                }

                            } else {
                                // L'actionneur n'est pas passé dans connectedDevices après un court délai
                                console.warn(`Actionneur ${actionneurMacAddress} n'est pas passé dans connectedDevices après le trigger.`);
                                logResult = AccessResult.echec_identification_actionneur;
                                refusalReason = "Actionneur non identifié à temps.";
                                const log = await accessLogRepository.createAccessLog({
                                    dispositif_id: attemptData.deviceId,
                                    type_tentative: attemptData.attemptType,
                                    resultat: logResult,
                                    utilisateur_id: userId,
                                    badge_id: badgeId,
                                    uid_rfid_tente: attemptData.uidRfid,
                                    adresse_ip: req.ip,
                                    details: { reason: refusalReason, actionneurMac: actionneurMacAddress },
                                });
                                return { granted: false, reason: refusalReason, logId: log.id };
                            }

                        } catch (sendTriggerErr: any) { // Type l'erreur
                            console.error(`Erreur lors de l'envoi du trigger à l'actionneur ${actionneurMacAddress}:`, sendTriggerErr);
                            logResult = AccessResult.echec_communication_actionneur;
                            refusalReason = "Erreur lors de l'envoi du déclencheur à l'actionneur.";
                            const log = await accessLogRepository.createAccessLog({
                                dispositif_id: attemptData.deviceId,
                                type_tentative: attemptData.attemptType,
                                resultat: logResult,
                                utilisateur_id: userId,
                                badge_id: badgeId,
                                uid_rfid_tente: attemptData.uidRfid,
                                adresse_ip: req.ip,
                                details: { reason: refusalReason, actionneurMac: actionneurMacAddress, error: sendTriggerErr.message },
                            });
                            return { granted: false, reason: refusalReason, logId: log.id };
                        }

                    } else {
                        // L'actionneur n'est pas trouvé dans les présences non identifiées (soit pas connecté du tout, soit n'a pas envoyé presence)
                        console.warn(`Actionneur ${actionneurMacAddress} non trouvé dans les présences non identifiées.`);
                        logResult = AccessResult.echec_actionneur_hors_ligne;
                        refusalReason = "Actionneur non connecté ou non détecté.";
                        const log = await accessLogRepository.createAccessLog({
                            dispositif_id: attemptData.deviceId,
                            type_tentative: attemptData.attemptType,
                            resultat: logResult,
                            utilisateur_id: userId,
                            badge_id: badgeId,
                            uid_rfid_tente: attemptData.uidRfid,
                            adresse_ip: req.ip,
                            details: { reason: refusalReason, actionneurMac: actionneurMacAddress },
                        });
                        return { granted: false, reason: refusalReason, logId: log.id };
                    }
                }

                // --- Fin de la logique pour trouver l'actionneur et envoyer les commandes ---

            } 
            // else if (attemptData.attemptType === AttemptType.qr_code) {
            //     // TODO: Gérer les tentatives par QR code ici
            //     // La logique serait similaire: valider le QR code, identifier l'utilisateur/l'accès, 
            //     // trouver l'actionneur associé, et envoyer la commande.
            //     logResult = AccessResult.echec_inconnu; // Ou un résultat spécifique pour QR code non implémenté
            //     refusalReason = "Méthode d'accès par QR Code non implémentée.";
            //     const log = await accessLogRepository.createAccessLog({
            //         dispositif_id: attemptData.deviceId,
            //         type_tentative: attemptData.attemptType,
            //         resultat: logResult,
            //         qr_code_tente: attemptData.qrCode,
            //         adresse_ip: req.ip,
            //         details: { reason: refusalReason },
            //     });
            //     return { granted: false, reason: refusalReason, logId: log.id };

            // } 


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

        } catch (error: any) {
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
                // qr_code_tente: attemptData.qrCode,
                adresse_ip: req.ip,
                details: { error: error.message },
            });
            return { granted: false, reason: refusalReason, logId: log.id };
        }
    }

    // Vous pourriez ajouter d'autres méthodes ici pour gérer d'autres logiques d'accès ou de configuration

    // Exemple: Méthode pour trouver un actionneur par sa zone d'accès (DOIT ÊTRE IMPLÉMENTÉE)
    // async getActionneurByZone(zoneAccesId: string): Promise<Device | null> {
    //     // Logique pour chercher dans la base de données un appareil de type 'actionneur'
    //     // associé à cette zone d'accès.
    //     // Retourne le premier actionneur trouvé ou null.
    //     return null; // <--- REMPLACER PAR LA VRAIE IMPLÉMENTATION
    // }
} 