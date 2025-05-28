import { app } from "./app";
import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Map pour stocker les connexions WebSocket par ID de dispositif
const connectedDevices = new Map<string, WebSocket>();

const wss = new WebSocketServer({ server });

wss.on('connection', function connection(ws, req) {
    console.log('WebSocket client connected');

    // Identifier le dispositif - ceci est un exemple, l'ESP32 devra envoyer son ID
    // Par exemple, l'ESP32 pourrait envoyer un premier message JSON: { "type": "identify", "deviceId": "votre_uuid_ici" }
    let deviceId: string | null = null;

    ws.on('message', function message(data) {
        console.log(`Received message from client: ${data}`);
        try {
            const message = JSON.parse(data.toString());
            if (message.type === 'identify' && message.deviceId) {
                deviceId = message.deviceId;
                connectedDevices.set(deviceId||"", ws);
                console.log(`Device ${deviceId} identified and connected.`);
                ws.send(JSON.stringify({ status: 'identified', deviceId: deviceId }));
            } else {
                console.warn('Unknown message format or not an identify message.', message);
                // Gérer d'autres types de messages si nécessaire
            }
        } catch (e) {
            console.error('Failed to parse message or process identify:', e);
            // ws.send(JSON.stringify({ status: 'error', message: 'Invalid message format' }));
        }
    });

    ws.on('close', function close() {
        console.log('WebSocket client disconnected');
        if (deviceId && connectedDevices.has(deviceId)) {
            connectedDevices.delete(deviceId);
            console.log(`Device ${deviceId} disconnected.`);
        }
    });

    ws.on('error', function error(err) {
        console.error('WebSocket error:', err);
        if (deviceId && connectedDevices.has(deviceId)) {
            connectedDevices.delete(deviceId);
            console.log(`Device ${deviceId} disconnected due to error.`);
        }
    });

    // Envoyer un message de bienvenue (optionnel)
    // ws.send('Welcome to the WebSocket server!');
});

console.log('WebSocket server started');

// Exporter la map des dispositifs connectés pour l'utiliser ailleurs (par exemple, dans access.service.ts)
export { connectedDevices };