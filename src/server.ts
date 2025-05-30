import { app } from "./app";
import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';
import { AccessResult, AttemptType } from "./models/access-log.model";
import { AccessLogRepository } from "./repositories/access-log.repository";

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Map pour stocker les connexions WebSocket identifiées par ID de dispositif (MAC)
const connectedDevices = new Map<string, WebSocket>();
// Map pour stocker les connexions WebSocket qui ont envoyé leur message de 'presence' mais ne sont pas encore complètement identifiées par 'identify'
const unidentifiedPresentDevices = new Map<string, WebSocket>();

const wss = new WebSocketServer({ server });

const  accessLogRepository = new AccessLogRepository()

wss.on('connection', function connection(ws, req) {
    console.log('Nouvelle connexion WebSocket reçue');

    // Une nouvelle connexion commence dans un état où l'on attend son message de 'presence'
    // Nous n'ajoutons pas à un set global non identifié ici, mais attendons le message 'presence'.
    // Une propriété temporaire peut être utile si on doit suivre des connexions *avant* même la présence (rare).

    // NOTE: Ne pas envoyer le triggerIdentification ici. Il sera envoyé par access.service.ts après validation du badge.
    // Laissez le client (ESP32) attendre le trigger après avoir envoyé son message de 'presence'.

    ws.on('message', async function message(data) {
        console.log(`Message reçu du client: ${data}`);
        try {
            const message = JSON.parse(data.toString()) as { type: string , command:"open", status:"success"|"error", mac:string , deviceId:string };

            // --- Logique de gestion des messages ---

            // Gérer les messages en fonction de si la connexion est identifiée ou non
            const deviceId = (ws as any).deviceId; // Vérifie si l'ID est déjà stocké (signifie identifié)

            if (!deviceId) { // Connexion non encore complètement identifiée par 'identify'
                // 1. Gérer le message initial de 'presence'
                if (message.type === 'presence' && message.mac) {
                    const macAddress = message.mac;
                    console.log(`Message de présence reçu de la MAC: ${macAddress}`);

                    // Optionnel: Vérifier si cette MAC est déjà présente dans unidentifiedPresentDevices
                    if (unidentifiedPresentDevices.has(macAddress)) {
                        console.warn(`MAC de présence ${macAddress} déjà dans les dispositifs non identifiés. Remplacer la connexion.`);
                         // Fermer l'ancienne connexion associée à cette MAC de présence si elle existe
                         const oldWs = unidentifiedPresentDevices.get(macAddress);
                         if(oldWs && oldWs !== ws && oldWs.readyState === WebSocket.OPEN) {
                              try { oldWs.send(JSON.stringify({ status: 'error', message: 'Another device with this MAC connected.' })); } catch (sendErr) { console.error('Error sending MAC conflict error:', sendErr); }
                              oldWs.terminate();
                         }
                    }
                     // Optionnel: Vérifier si cette MAC est déjà dans connectedDevices (état déjà identifié)
                     if (connectedDevices.has(macAddress)) {
                         console.warn(`MAC de présence ${macAddress} déjà dans les dispositifs identifiés. Fermeture de la nouvelle connexion de présence.`);
                          try { ws.send(JSON.stringify({ status: 'error', message: `Device ${macAddress} already connected and identified.` })); } catch (sendErr) { console.error('Error sending already identified error:', sendErr); }
                         ws.terminate(); // Fermer la nouvelle connexion de présence
                         return; // Arrêter le traitement pour ce message
                     }


                    // Ajouter la connexion à la map des présences non identifiées avec la MAC comme clé
                    unidentifiedPresentDevices.set(macAddress, ws);
                    // Stocker la MAC temporairement sur l'objet ws pour un accès facile dans les handlers close/error/identify
                    (ws as any).tempMac = macAddress;

                    console.log(`Connexion de présence ajoutée pour MAC ${macAddress}. Total présences non identifiées: ${unidentifiedPresentDevices.size}`);

                    // Ne pas envoyer de confirmation ici, l'identification complète viendra plus tard.

                } else if (message.type === 'identify' && message.deviceId) {
                     // 2. Gérer le message d'identification FINAL si la connexion a déjà envoyé sa présence
                    const deviceIdToIdentify = message.deviceId;
                    console.log(`Tentative d'identification pour Device ID: ${deviceIdToIdentify}`);

                    // Vérifier si cette connexion a déjà envoyé un message de 'presence' avec cette MAC
                    if ((ws as any).tempMac && (ws as any).tempMac === deviceIdToIdentify) {
                         // Vérifier si l'ID de dispositif est déjà connecté et identifié (double vérification, devrait être géré par le check de presence mais sécurité)
                        if (connectedDevices.has(deviceIdToIdentify)) {
                            console.warn(`Dispositif ${deviceIdToIdentify} déjà connecté. Fermeture de la nouvelle connexion.`);
                            // Envoyer un message d'erreur et fermer la nouvelle connexion
                             try { ws.send(JSON.stringify({ status: 'error', message: `Device ${deviceIdToIdentify} already connected.` })); } catch (sendErr) { console.error('Error sending already connected error:', sendErr); }
                            ws.terminate(); // Fermer la nouvelle connexion
                            return; // Arrêter le traitement pour ce message
                        }

                        // Retirer la connexion de la map des présences non identifiées et l'ajouter à la map des identifiées
                        unidentifiedPresentDevices.delete(deviceIdToIdentify);
                        connectedDevices.set(deviceIdToIdentify, ws);
                        // Stocker l'ID du dispositif sur l'objet ws pour un accès facile dans les handlers close/error
                        (ws as any).deviceId = deviceIdToIdentify;

                        console.log(`Dispositif ${deviceIdToIdentify} identifié. Total présences non identifiées: ${unidentifiedPresentDevices.size}, Total identifiées: ${connectedDevices.size}`);

                        // Envoyer une confirmation d'identification au client
                        try {
                           ws.send(JSON.stringify({ status: 'identified', deviceId: deviceIdToIdentify }));
                           

                        } catch (sendErr) { console.error('Error sending identification confirmation:', sendErr); }

                    } else {
                        console.warn(`Message 'identify' reçu d'une connexion sans 'presence' préalable correspondante ou MAC mismatch. Message ignoré:`, message);
                        // Optionnel: envoyer une erreur au client ou fermer la connexion
                        try { ws.send(JSON.stringify({ status: 'error', message: 'Presence message required before identification.' })); } catch (sendErr) { console.error('Error sending presence required error:', sendErr); }
                        // ws.terminate();
                    }
                } else {
                    console.warn('Message reçu d\'une connexion non identifiée (pas presence/identify). Message ignoré:', message);
                    // Optionnel: informer le client qu'il doit envoyer 'presence' ou 'identify'
                     try { ws.send(JSON.stringify({ status: 'error', message: 'First message must be type \'presence\'.' })); } catch (sendErr) { console.error('Error sending initial message type error:', sendErr); }
                }
            } else { // Connexion déjà complètement identifiée
                // Gérer les messages des connexions déjà identifiées (commandes, statuts, erreurs de l'ESP32)
                 console.log(`Message reçu du dispositif identifié ${deviceId}:`, message);

                 // --- Ajoutez votre logique pour traiter les commandes et statuts des actionneurs ici ---
                 // Par exemple, si message.command === 'setAngle', traiter message.angle
                 // Si message.type === 'status', traiter les informations de statut

                 if (message.type === 'status') {
                      console.log(`Statut reçu de ${deviceId}:`, message);

                        try {

                            await accessLogRepository.createAccessLog({
                                dispositif_id: deviceId,
                                type_tentative: AttemptType.action,
                                resultat: AccessResult.succes,
                                utilisateur_id: "",
                                badge_id: "",
                                uid_rfid_tente: "",
                                adresse_ip: "",
                                details: { actionneurMac: deviceId },
                            });

                        }catch{
                            console.error("erreur lors de la creation de log dans websoket")
                        }
                      // Traiter l'état rapporté par l'actionneur
                  } else if (message.type === 'error') {
                       console.error(`Erreur rapportée par le dispositif ${deviceId}:`, message);

                       try {

                        await accessLogRepository.createAccessLog({
                            dispositif_id: deviceId,
                            type_tentative: AttemptType.action,
                            resultat: AccessResult.echec_actionneur_hors_ligne,
                            utilisateur_id: "",
                            badge_id: "",
                            uid_rfid_tente: "",
                            adresse_ip: "",
                            details: { actionneurMac: deviceId },
                        });

                    }catch{
                        console.error("erreur lors de la creation de log dans websocket")
                    } 
                       // Gérer les erreurs rapportées par l'actionneur
                   } else if (message.command) {
                       console.warn(`Commande reçue de ${deviceId} (client actionneur ne devrait pas envoyer de commandes). Message ignoré:`, message);

                       // Le client actionneur ne devrait pas envoyer de commandes, seulement des statuts ou erreurs.
            } else {
                      console.warn(`Type de message inconnu reçu du dispositif identifié ${deviceId}:`, message);
                      // Optionnel: envoyer une erreur au client identifié
                       if (ws.readyState === WebSocket.OPEN) { // Vérifier si la connexion est ouverte avant d'envoyer
                          try { 

                            ws.send(JSON.stringify({ status: 'error', message: 'Unknown message type for identified device.', receivedMessage: message })); 

                            await accessLogRepository.createAccessLog({
                                dispositif_id: deviceId,
                                type_tentative: AttemptType.action,
                                resultat: AccessResult.echec_inconnu,
                                utilisateur_id: "",
                                badge_id: "",
                                uid_rfid_tente: "",
                                adresse_ip: "",
                                details: { actionneurMac: deviceId },
                            });

                        } catch (sendErr) { console.error('Error sending unknown message type error:', sendErr); 

                        }
                       }
                    }
            }

        } catch (e) {
            console.error('Échec du parsing ou du traitement du message:', e);
            // Envoyer un message d'erreur au client si le message n'est pas un JSON valide
            if (ws.readyState === WebSocket.OPEN) { // Vérifier si la connexion est ouverte avant d'envoyer
               try { ws.send(JSON.stringify({ status: 'error', message: 'Invalid JSON format received.' })); } catch (sendErr) { console.error('Error sending invalid json error:', sendErr); }
            }
        }
    });

    ws.on('close', function close() {
        const deviceId = (ws as any).deviceId; // ID pour connexion identifiée
        const tempMac = (ws as any).tempMac; // MAC pour connexion ayant envoyé 'presence'

        console.log(`Connexion WebSocket fermée pour ${deviceId || tempMac || 'un dispositif inconnu'}`);

        // Retirer la connexion de la map appropriée
        if (deviceId && connectedDevices.has(deviceId)) {
            connectedDevices.delete(deviceId);
            console.log(`Dispositif identifié ${deviceId} déconnecté.`);
        } else if (tempMac && unidentifiedPresentDevices.has(tempMac)) {
             unidentifiedPresentDevices.delete(tempMac);
             console.log(`Dispositif avec présence non identifiée ${tempMac} déconnecté.`);
        }
         console.log(`Total présences non identifiées: ${unidentifiedPresentDevices.size}, Total identifiées: ${connectedDevices.size}`);
    });

    ws.on('error', function error(err) {
         const deviceId = (ws as any).deviceId; // ID pour connexion identifiée
        const tempMac = (ws as any).tempMac; // MAC pour connexion ayant envoyé 'presence'
        console.error(`Erreur WebSocket pour ${deviceId || tempMac || 'un dispositif inconnu'}:`, err);

        // Les erreurs entraînent souvent la fermeture, donc la logique de 'close' gérera la suppression.
        // Cependant, on peut vouloir logguer spécifiquement ici si nécessaire.
        // S'assurer que la connexion est retirée des maps en cas d'erreur qui ne déclenche pas 'close'
        if (deviceId && connectedDevices.has(deviceId)) {
            connectedDevices.delete(deviceId);
             console.log(`Dispositif identifié ${deviceId} retiré à cause d'une erreur.`);
         } else if (tempMac && unidentifiedPresentDevices.has(tempMac)) {
              unidentifiedPresentDevices.delete(tempMac);
              console.log(`Dispositif avec présence non identifiée ${tempMac} retiré à cause d'une erreur.`);
        }
          console.log(`Total présences non identifiées: ${unidentifiedPresentDevices.size}, Total identifiées: ${connectedDevices.size}`);
    });
});

console.log('WebSocket server started');

// Exporter les maps des dispositifs connectés et présents non identifiés
export { connectedDevices, unidentifiedPresentDevices };