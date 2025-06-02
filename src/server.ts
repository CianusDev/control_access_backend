import { app } from "./app";
import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';
import { AccessResult, AttemptType } from "./models/access-log.model";
import { AccessLogRepository } from "./repositories/access-log.repository";

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running ...`);
});

// Map pour stocker les connexions WebSocket identifiées par ID de dispositif (MAC)
const connectedDevices = new Map<string, WebSocket>();
// Map pour stocker les connexions WebSocket qui ont envoyé leur message de 'presence' mais ne sont pas encore complètement identifiées par 'identify'
const unidentifiedPresentDevices = new Map<string, WebSocket>();
// Création du serveur WebSocket
const wss = new WebSocketServer({ server });
// Création du repository pour les logs d'accès
const  accessLogRepository = new AccessLogRepository()

// Gestion des connexions WebSocket
wss.on('connection', function connection(ws, req) {
    console.log('Nouvelle connexion WebSocket reçue');
    // Une nouvelle connexion commence dans un état où l'on attend son message de 'presence'
    // Nous n'ajoutons pas à un set global non identifié ici, mais attendons le message 'presence'.
    // Une propriété temporaire peut être utile si on doit suivre des connexions *avant* même la présence (rare).

    // NOTE: Ne pas envoyer le triggerIdentification ici. Il sera envoyé par access.service.ts après validation du badge.
    // Laissez le client (ESP32) attendre le trigger après avoir envoyé son message de 'presence'.

    // Gestion des messages reçus par le client
    ws.on('message', async function message(data) {
        console.log(`Message reçu du client: ${data}`);

        // Helper functions
        const sendError = async (ws: WebSocket, message: string) => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify({ status: 'error', message }));
                } catch (err) {
                    console.error('Error sending message:', err);
                }
            }
        };

        try {
            const message = JSON.parse(data.toString()) as { type: string, command: "open", status: "success" | "error", mac: string, deviceId: string };
            const deviceId = (ws as any).deviceId;
            
            // Fonction pour créer un log d'accès
            const createAccessLog = async (deviceId: string, result: AccessResult) => {
                try {
                    await accessLogRepository.createAccessLog({
                        dispositif_id: deviceId,
                        type_tentative: AttemptType.verrou,
                        resultat: result,
                        utilisateur_id: "",
                        badge_id: "",
                        uid_rfid_tente: "",
                        adresse_ip: "",
                        details: { actionneurMac: deviceId },
                    });
                } catch (err) {
                    console.error("Erreur lors de la création de log dans websocket:", err);
                }
            };

            // Fonction pour gérer les connexions existantes
            const handleExistingConnections = async (macAddress: string, ws: WebSocket) => {
                if (unidentifiedPresentDevices.has(macAddress)) {
                    const oldWs = unidentifiedPresentDevices.get(macAddress);
                    if (oldWs && oldWs !== ws && oldWs.readyState === WebSocket.OPEN) {
                        await sendError(oldWs, 'Un autre appareil avec cette adresse MAC est connecté.');
                        oldWs.terminate();
                    }
                }

                if (connectedDevices.has(macAddress)) {
                    await sendError(ws, `Un autre appareil avec cette adresse MAC est connecté.`);
                    ws.terminate();
                    return;
                }
                // Ajouter la connexion à la map des présences non identifiées avec la MAC comme clé
                unidentifiedPresentDevices.set(macAddress, ws);
            };

            // Fonction pour gérer l'identification des dispositifs
            const handleDeviceIdentification = async (ws: WebSocket, deviceIdToIdentify: string, message: any) => {
                // Vérifier si la MAC temporaire correspond à l'ID de dispositif à identifier
                if ((ws as any).tempMac === deviceIdToIdentify) {
                    if (connectedDevices.has(deviceIdToIdentify)) {
                        await sendError(ws, `Device ${deviceIdToIdentify} already connected.`);
                        ws.terminate();
                        return;
                    }

                    unidentifiedPresentDevices.delete(deviceIdToIdentify);
                    connectedDevices.set(deviceIdToIdentify, ws);
                    (ws as any).deviceId = deviceIdToIdentify;

                    console.log(`Dispositif ${deviceIdToIdentify} identifié. Total identifiés: ${connectedDevices.size}`);
                    ws.send(JSON.stringify({ status: 'identified', deviceId: deviceIdToIdentify }));

                } else {
                    console.warn(`Message 'identify' reçu sans 'presence' préalable ou MAC mismatch:`, message);
                    await sendError(ws, 'Presence message required before identification.');
                }
            };


            if (!deviceId) {
                // Gérer les connexions non identifiées
                if (message.type === 'presence' && message.mac) {
                    const macAddress = message.mac;
                    console.log(`Message de présence reçu de la MAC: ${macAddress}`);
                    await handleExistingConnections(macAddress, ws);
                    // Stocker la MAC temporairement sur l'objet ws pour un accès facile dans les handlers close/error/identify
                    (ws as any).tempMac = macAddress;
                    console.log(`Connexion de présence ajoutée pour MAC ${macAddress}. Total: ${unidentifiedPresentDevices.size}`);

                } else if (message.type === 'identify' && message.deviceId) {
                    const deviceIdToIdentify = message.deviceId;
                    console.log(`Tentative d'identification pour Device ID: ${deviceIdToIdentify}`);
                    await handleDeviceIdentification(ws, deviceIdToIdentify, message);

                } else {
                    console.warn('Message invalide reçu:', message);
                    await sendError(ws, 'First message must be type \'presence\'.');
                }

            } else {
                // Gérer les connexions identifiées
                console.log(`Message reçu du dispositif ${deviceId}:`, message);

                switch (message.type) {
                    case 'status':
                        console.log(`Statut reçu de ${deviceId}:`, message);
                        await createAccessLog(deviceId, AccessResult.succes);
                        break;

                    case 'error':
                        console.error(`Erreur rapportée par ${deviceId}:`, message);
                        await createAccessLog(deviceId, AccessResult.echec_dispositif_hors_ligne);
                        break;

                    default:
                        if (message.command) {
                            console.warn(`Commande invalide reçue de ${deviceId}:`, message);
                        } else {
                            console.warn(`Type de message inconnu de ${deviceId}:`, message);
                            await sendError(ws, 'Type de message inconnu pour le dispositif identifié.');
                            await createAccessLog(deviceId, AccessResult.echec_inconnu);
                        }
                }
            }

        } catch (e) {
            console.error('Échec du parsing ou du traitement du message:', e);
            if (ws.readyState === WebSocket.OPEN) {
                await sendError(ws, 'Invalid JSON format received.');
            }
        }
    });
    
    // Gestion des fermetures de connexions WebSocket
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

    // Gestion des erreurs de connexions WebSocket
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

console.log('WebSocket server started ...');

// Exporter les maps des dispositifs connectés et présents non identifiés
export { connectedDevices, unidentifiedPresentDevices };