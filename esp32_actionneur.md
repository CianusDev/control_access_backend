#include <Arduino.h>
#include <ESP32Servo.h> // Inclure la bibliothèque pour servomoteur
#include <WiFi.h> // Pour la connexion Wi-Fi
#include <WebSocketsClient.h> // Bibliothèque pour client WebSocket (Markus Sattler)
#include <ArduinoJson.h> // Inclure la bibliothèque pour gérer le JSON

// Configuration du Wi-Fi
const char* ssid = "nom de votre réseau Wi-Fi"; // Remplacez par le nom de votre réseau Wi-Fi
const char* password = "Votre mot de passe"; // Remplacez par le mot de passe de votre réseau Wi-Fi

// Configuration du servomoteur
const int SERVO_PIN = 15; // Broche GPIO pour le servomoteur
Servo myservo; // Créer un objet Servo

// Configuration du serveur WebSocket du backend
const char* websocket_server_address = "IP de votre backend"; // Remplacez par l'adresse IP de votre backend
const uint16_t websocket_server_port = 5000; // Remplacez par le port de votre serveur WebSocket

WebSocketsClient webSocketClient; // Objet client WebSocket

// Variable pour suivre si l'ESP32 s'est identifié auprès du backend (après le trigger)
bool isIdentified = false;

// Forward declaration
void processReceivedCommand(const char* command, size_t length);

// Fonction pour obtenir l'adresse MAC de l'ESP32 au format String (XX:XX:XX:XX:XX:XX)
String getESP32MacAddress() {
  return WiFi.macAddress();
}

// Fonction de gestion des événements WebSocket
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("Déconnecté du serveur WebSocket");
      isIdentified = false; // Réinitialiser l'état d'identification à la déconnexion
      break;
      
    case WStype_CONNECTED:
      Serial.printf("Connecté au serveur WebSocket: %s\n", payload);
      isIdentified = false; // S'assurer que l'état est non identifié au début de la connexion
      // Envoyer un message de présence initial avec l'adresse MAC (pas l'identification finale)
      {
        StaticJsonDocument<64> doc;
        doc["type"] = "presence";
        doc["mac"] = getESP32MacAddress();
        String output;
        serializeJson(doc, output);
        webSocketClient.sendTXT(output);
        Serial.printf("Envoyé (Présence): %s\n", output.c_str());
      }
      // Attendre le message de déclenchement du backend pour l'identification complète.
      break;
      
    case WStype_TEXT: {
      Serial.printf("Message texte reçu: %s\n", payload);
      // Tenter de traiter le message comme une commande JSON ou un trigger
      processReceivedCommand((char*)payload, length);
      break;
    }
      
    case WStype_BIN:
      Serial.printf("Données binaires reçues de longueur: %u\n", length);
      // Traiter les données binaires si nécessaire
      break;
      
    case WStype_PING:
      Serial.println("Ping reçu");
      break;
      
    case WStype_PONG:
      Serial.println("Pong reçu");
      break;
      
    case WStype_ERROR:
      Serial.printf("Erreur WebSocket\n");
      // payload contient le code d'erreur ou le message
      if (length > 0) {
         // Assurez-vous que payload est terminé par un null pour l'affichage
         char error_msg[length + 1];
         memcpy(error_msg, payload, length);
         error_msg[length] = '\0';
         Serial.printf("Message d'erreur: %s\n", error_msg);
      }
      break;
      
    default:
      Serial.printf("Type d'événement WebSocket non géré: %d\n", type);
      break;
  }
}

// Fonction pour traiter les messages JSON reçus (commandes, déclencheur d'identification, statuts)
void processReceivedCommand(const char* command, size_t length) {
  // Assurez-vous que la chaîne est terminée par null pour le parsing JSON
  char json_buffer[length + 1];
  memcpy(json_buffer, command, length);
  json_buffer[length] = '\0';

  StaticJsonDocument<128> doc; // Ajustez la taille selon vos besoins. 128 devrait suffire pour les messages actuels.

  DeserializationError error = deserializeJson(doc, json_buffer);

  if (error) {
    Serial.print(F("deserializeJson() failed: "));
    Serial.println(error.f_str());
    // Envoyer un message d'erreur au backend si le parsing échoue
    if (webSocketClient.isConnected()) {
      StaticJsonDocument<64> error_doc;
      error_doc["type"] = "error";
      error_doc["message"] = "Invalid JSON format received";
      error_doc["received_text"] = json_buffer; // Inclure le texte reçu pour debugging
      String output;
      serializeJson(error_doc, output);
      webSocketClient.sendTXT(output);
       Serial.printf("Envoyé (Erreur Parsing JSON): %s\n", output.c_str());
    }
    return;
  }

  // --- Logique de traitement basée sur le contenu JSON ---

  // Tenter d'obtenir le champ 'type' en premier
  if (doc.containsKey("type")) {
    String messageType = doc["type"].as<String>();

    // --- Gérer les messages système ou de statut basés sur le 'type' ---
    if (messageType == "triggerIdentification") {
      Serial.println("Déclencheur d'identification reçu du backend.");
      if (!isIdentified) {
        // Envoyer le message d'identification FINAL au format JSON avec l'adresse MAC
        StaticJsonDocument<64> identify_doc;
        identify_doc["type"] = "identify"; // Type attendu par le backend pour l'identification finale
        identify_doc["deviceId"] = getESP32MacAddress();
        String output;
        serializeJson(identify_doc, output);
        webSocketClient.sendTXT(output);
        Serial.printf("Envoyé (Identification finale): %s\n", output.c_str());
        isIdentified = true; // Marquer comme identifié APRÈS avoir envoyé le message 'identify'
      } else {
        Serial.println("Déclencheur d'identification reçu à nouveau, mais déjà identifié.");
      }
    }
    // L'ESP32 envoie le message de présence, il ne devrait pas le recevoir normalement du backend.
    // Ce cas est juste pour la robustesse.
    else if (messageType == "presence") {
        Serial.println("Message de présence reçu du backend ? (Inattendu côté client actionneur)");
     }
     // Gérer les messages de statut envoyés PAR le backend (par exemple, confirmation de commande, erreurs backend)
     else if (messageType == "status") {
          Serial.printf("Message de statut reçu du backend: %s\n", json_buffer);
          // Vous pouvez ajouter une logique ici pour traiter des statuts spécifiques du backend si nécessaire.
     }
      else if (messageType == "error") {
          Serial.printf("Message d'erreur reçu du backend: %s\n", json_buffer);
          // Vous pouvez ajouter une logique ici pour gérer des erreurs spécifiques rapportées par le backend.
      }
    // --- Ajoutez d'autres gestionnaires de types de messages système ici ---

  }
  // --- Si pas de champ 'type', vérifier si c'est un message de commande (champ 'command') ---
  // Les commandes d'actionnement ne devraient être traitées que si le dispositif est identifié.
  else if (isIdentified && doc.containsKey("command")) {
      // Appeler une fonction séparée pour gérer les commandes du servomoteur
      handleCommand(doc.as<JsonObject>());

  }
  // --- Gérer les messages inattendus ---

  // Si le message n'a ni 'type' ni 'command' et n'a pas été géré avant
  else if (!doc.containsKey("type") && !doc.containsKey("command")) {
      Serial.printf("Message JSON reçu sans champs 'type' ou 'command': %s\n", json_buffer);
      // Envoyer une erreur au backend indiquant le format inattendu
      if (webSocketClient.isConnected()) {
          StaticJsonDocument<64> error_doc;
          error_doc["type"] = "error"; // Utilisez le type 'error'
          error_doc["message"] = "JSON message must contain 'type' or 'command' field";
          error_doc["received_text"] = json_buffer;
          String output;
          serializeJson(error_doc, output);
          webSocketClient.sendTXT(output);
          Serial.printf("Envoyé (Erreur Format JSON Général): %s\n", output.c_str());
       }
  }
   // Si le message a un champ 'command' mais que le dispositif n'est pas identifié
   else if (doc.containsKey("command") && !isIdentified) {
      Serial.printf("Commande reçue avant identification, ignorée: %s\n", json_buffer);
       if (webSocketClient.isConnected()) {
           StaticJsonDocument<64> error_doc;
           error_doc["type"] = "status"; // Utilisez le type 'status' pour signaler l'état non prêt
           error_doc["status"] = "error";
           error_doc["message"] = "Device not identified, cannot process commands";
            error_doc["received_text"] = json_buffer;
           String output;
           serializeJson(error_doc, output);
           webSocketClient.sendTXT(output);
           Serial.printf("Envoyé (Erreur Non Identifié pour Commande): %s\n", output.c_str());
         }
   }
    // Si le message a un champ 'type' qui n'a pas été géré (par exemple, un type inconnu du backend)
    else if (doc.containsKey("type")) { // Cela attrape les types non gérés dans le premier if
       String messageType = doc["type"].as<String>();
        Serial.printf("Message JSON avec type inconnu reçu: %s (type: %s)\n", json_buffer, messageType.c_str());
        if (webSocketClient.isConnected()) {
           StaticJsonDocument<64> error_doc;
           error_doc["type"] = "error";
           error_doc["message"] = "Unknown message type";
           error_doc["received_type"] = messageType;
           error_doc["received_text"] = json_buffer;
           String output;
           serializeJson(error_doc, output);
           webSocketClient.sendTXT(output);
           Serial.printf("Envoyé (Erreur Type Inconnu): %s\n", output.c_str());
         }
    }
}

// Nouvelle fonction pour gérer les commandes spécifiques de l'actionneur
void handleCommand(JsonObject commandDoc) {
    if (!commandDoc.containsKey("command")) {
        Serial.println("handleCommand appelé sans champ 'command'.");
        // Ceci ne devrait pas arriver si appelé correctement depuis processReceivedCommand
        return;
    }

    String commandType = commandDoc["command"].as<String>();
    Serial.printf("Traitement de la commande: %s\n", commandType.c_str());

    if (commandType == "setAngle") {
        if (commandDoc.containsKey("angle")) {
            int angle = commandDoc["angle"];
            Serial.printf("Commande setAngle reçue avec angle: %d\n", angle);

            // Limiter l'angle aux valeurs acceptées par le servomoteur (0-180 degrés)
            if (angle >= 0 && angle <= 180) {
                myservo.write(angle); // Déplacer le servomoteur à l'angle spécifié
                // Confirmer le mouvement au backend avec JSON
                if (webSocketClient.isConnected()) {
                    StaticJsonDocument<64> response_doc;
                    response_doc["type"] = "status";
                    response_doc["command"] = "setAngle";
                    response_doc["status"] = "success";
                    response_doc["angle"] = angle;
                    String output;
                    serializeJson(response_doc, output);
                    webSocketClient.sendTXT(output);
                    Serial.printf("Envoyé (Statut setAngle Success): %s\n", output.c_str());
                }
            } else {
                Serial.println("Angle invalide reçu pour setAngle (doit être entre 0 et 180)");
                // Envoyer une erreur au backend avec JSON
                if (webSocketClient.isConnected()) {
                    StaticJsonDocument<64> error_doc;
                    error_doc["type"] = "status"; // Utilisez le type 'status' ou 'error' pour le rapport
                    error_doc["command"] = "setAngle";
                    error_doc["status"] = "error";
                    error_doc["message"] = "Invalid angle received";
                    error_doc["received_angle"] = angle;
                    String output;
                    serializeJson(error_doc, output);
                    webSocketClient.sendTXT(output);
                    Serial.printf("Envoyé (Erreur setAngle Angle Invalide): %s\n", output.c_str());
                }
            }
        } else {
             Serial.println("Commande setAngle reçue sans champ 'angle'.");
             if (webSocketClient.isConnected()) {
                StaticJsonDocument<64> error_doc;
                error_doc["type"] = "status";
                error_doc["command"] = "setAngle";
                error_doc["status"] = "error";
                error_doc["message"] = "'angle' field missing for setAngle command";
                String output;
                serializeJson(error_doc, output);
                webSocketClient.sendTXT(output);
                Serial.printf("Envoyé (Erreur setAngle No Angle): %s\n", output.c_str());
            }
        }
    }
    // --- Ajoutez d'autres gestionnaires de commandes ici (getStatus, center, min, max) ---
     else if (commandType == "getStatus") {
         Serial.println("Commande getStatus reçue");
         if (webSocketClient.isConnected()) {
           // Envoyer le statut actuel du servo au backend avec JSON
           int currentAngle = myservo.read();
           StaticJsonDocument<64> response_doc;
           response_doc["type"] = "status";
           response_doc["command"] = "getStatus";
           response_doc["angle"] = currentAngle;
           response_doc["status"] = "success"; // Indiquer le succès de la réponse
           String output;
           serializeJson(response_doc, output);
           webSocketClient.sendTXT(output);
           Serial.printf("Envoyé (Statut getStatus): %s\n", output.c_str());
         }
      }
       else if (commandType == "center") {
        Serial.println("Commande center reçue");
        myservo.write(90);
        delay(50); // Petit délai pour le mouvement du servo
        if (webSocketClient.isConnected()) {
          StaticJsonDocument<64> response_doc;
          response_doc["type"] = "status";
          response_doc["command"] = "center";
          response_doc["status"] = "success";
          response_doc["angle"] = myservo.read(); // Envoyer l'angle après le mouvement
          String output;
          serializeJson(response_doc, output);
          webSocketClient.sendTXT(output);
          Serial.printf("Envoyé (Statut center): %s\n", output.c_str());
        }
      }
       else if (commandType == "min") {
        Serial.println("Commande min reçue");
        myservo.write(0);
        delay(50); // Petit délai pour le mouvement du servo
         if (webSocketClient.isConnected()) {
          StaticJsonDocument<64> response_doc;
          response_doc["type"] = "status";
          response_doc["command"] = "min";
          response_doc["status"] = "success";
          response_doc["angle"] = myservo.read();
          String output;
          serializeJson(response_doc, output);
          webSocketClient.sendTXT(output);
          Serial.printf("Envoyé (Statut min): %s\n", output.c_str());
         }
      }
       else if (commandType == "max") {
        Serial.println("Commande max reçue");
        myservo.write(180);
        delay(50); // Petit délai pour le mouvement du servo
         if (webSocketClient.isConnected()) {
          StaticJsonDocument<64> response_doc;
          response_doc["type"] = "status";
          response_doc["command"] = "max";
          response_doc["status"] = "success";
          response_doc["angle"] = myservo.read();
          String output;
          serializeJson(response_doc, output);
          webSocketClient.sendTXT(output);
          Serial.printf("Envoyé (Statut max): %s\n", output.c_str());
         }
      }
    else {
        Serial.printf("Commande inconnue reçue: %s\n", commandType.c_str());
        // Envoyer un message d'erreur pour commande inconnue
        if (webSocketClient.isConnected()) {
           StaticJsonDocument<64> error_doc;
           error_doc["type"] = "status"; // Utilisez le type 'status' ou 'error'
           error_doc["status"] = "error";
           error_doc["message"] = "Unknown command";
           error_doc["command_received"] = commandType;
           String output;
           serializeJson(error_doc, output);
           webSocketClient.sendTXT(output);
           Serial.printf("Envoyé (Erreur Commande Inconnue): %s\n", output.c_str());
         }
    }
}

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("Démarrage ESP32 Actionneur (Servomoteur/WebSocket)");

  // Connexion au Wi-Fi
  Serial.print("Connexion au Wi-Fi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("Wi-Fi connecté");
  Serial.print("Adresse IP: ");
  Serial.println(WiFi.localIP());

  // Récupérer et afficher l'adresse MAC de l'ESP32
  String macAddress = getESP32MacAddress();
  Serial.print("Adresse MAC ESP32 : ");
  Serial.println(macAddress);

  // Initialisation du servomoteur
  // Configuration pour ESP32 - utilise les canaux PWM
  // La broche 15 est généralement bonne pour le PWM.
  myservo.setPeriodHertz(50); // Fréquence standard pour servomoteur (50 Hz)
  myservo.attach(SERVO_PIN, 1000, 2000); // Attacher avec paramètres min/max en microsecondes
  
  // Position initiale au centre
  myservo.write(90);
  Serial.println("Servomoteur initialisé à 90 degrés");
  delay(1000); // Laisser le temps au servo de se positionner

  // Initialisation du client WebSocket
  webSocketClient.begin(websocket_server_address, websocket_server_port, "/");
  webSocketClient.onEvent(webSocketEvent);
  webSocketClient.setReconnectInterval(5000); // Tenter de se reconnecter toutes les 5 secondes
  webSocketClient.enableHeartbeat(15000, 3000, 2); // ping interval, pong timeout, disconnect timeout
  
  Serial.println("Client WebSocket initialisé");
  Serial.printf("Tentative de connexion à ws://%s:%d/\n", websocket_server_address, websocket_server_port);
}

void loop() {
  // Gérer la connexion et les événements WebSocket
  webSocketClient.loop();
  
  // Petite pause pour éviter de surcharger le processeur
  delay(10);
}

// Les fonctions sendServoStatus et processCommand originales ne sont plus utilisées directement car la logique de traitement est maintenant dans webSocketEvent et processReceivedCommand.
// Vous pouvez les adapter ou les supprimer si elles ne sont pas appelées ailleurs.
// Exemple: adaptation de processCommand pour un usage potentiel interne si nécessaire.
/*
void processCommand(String command) {
  // Cette fonction peut être adaptée si vous avez besoin de traiter des commandes non reçues via WebSocket
  // ou pour des logiques de contrôle internes.
  // Pour les commandes WebSocket, la logique est dans processReceivedCommand.
}
*/