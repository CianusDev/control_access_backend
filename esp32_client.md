#include <WiFi.h>
#include <WebSocketsServer.h> 
#include <Keypad.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>

#define SENSOR_READ_INTERVAL 2000  // Lecture des capteurs toutes les 2 secondes
#define JSON_BUFFER_SIZE 128       // Réduction de la taille du buffer JSON

// Configuration du réseau WiFi client
const char* ssid = "ESGIS_ZONE"; // Votre SSID
const char* password = "groupeesgis1"; // Votre mot de passe 

#define SS_PIN 5    // SDA du RC522
#define RST_PIN 22  // RST du RC522
#define RED_LED 3
#define YELLOW_LED 4
#define GREEN_LED 5

// Keypad definitions
const byte ROWS = 4;
const byte COLS = 4;
char hexaKeys[ROWS][COLS] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};
byte rowPins[ROWS] = {13, 12, 14, 27};
byte colPins[COLS] = {26, 25, 33, 32};
Keypad customKeypad = Keypad(makeKeymap(hexaKeys), rowPins, colPins, ROWS, COLS);

MFRC522 mfrc522(SS_PIN, RST_PIN);

String uidRfid = "";
String enteredPin = "";
bool cardScanned = false;
const int PIN_LENGTH = 8; // Assumant un code PIN alphanumérique de 8 caractères

// Ajoutez cette fonction pour envoyer les données au backend
void sendDataToBackend(String pin, String idfVersion, String uidRfid) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    String serverPath = "http://169.254.87.113:5000/api"; // Votre URL de backend

    // Préparez les données à envoyer (format JSON)
    StaticJsonDocument<JSON_BUFFER_SIZE * 2> doc; // Augmentez un peu la taille du buffer si nécessaire
    doc["deviceId"] = idfVersion;
    doc["uidRfid"] = uidRfid;
    doc["pin"] = pin;
    doc["attemptType"] = "badge_pin";
    
    // Ajoutez ici d'autres données si nécessaire, par exemple doc["temperature"] = lastTemp; doc["humidity"] = lastHum;

    String requestBody;
    serializeJson(doc, requestBody);

    // Démarrez la connexion HTTP
    http.begin(serverPath + "/access");
    http.addHeader("Content-Type", "application/json");

    // Envoyez la requête POST
    int httpResponseCode = http.POST(requestBody);

    // Traitez la réponse
    if (httpResponseCode>0) {
      Serial.printf("[HTTP] POST... code: %d\n", httpResponseCode);
      String payload = http.getString();
      Serial.println("Réponse du backend : " + payload); // Afficher la réponse brute

      // Parser la réponse JSON
      StaticJsonDocument<JSON_BUFFER_SIZE * 2> responseDoc; // Utilisez le même buffer size ou ajustez si nécessaire
      DeserializationError error = deserializeJson(responseDoc, payload);

      if (error) {
        Serial.print(F("Erreur de désérialisation JSON : "));
        Serial.println(error.f_str());
      } else {
        // Lire les champs "message" et "reason"
        const char* message = responseDoc["message"];
        const char* reason = responseDoc["reason"];

        if (message) {
          Serial.print("Message : ");
          Serial.println(message);

          // Gérer les cas spécifiques
          if (strcmp(message, "Accès refusé") == 0) {
            if (reason && strcmp(reason, "PIN incorrect") == 0) {
              Serial.println("Raison : PIN incorrect. Veuillez réessayer.");
            } else if (reason) {
              Serial.print("Accès refusé pour la raison : ");
              digitalWrite(RED_LED,LOW);
              Serial.println(reason);
            } else {
              Serial.println("Accès refusé pour une raison inconnue.");
            }
          } else if (strcmp(message, "Accès accordé") == 0) {
             Serial.println("Accès accordé ! Bienvenue.");
             // Ajoutez ici d'autres actions pour un accès accordé si nécessaire
          }
           // Ajoutez d'autres cas de message si nécessaire
        } else {
          Serial.println("La réponse JSON ne contient pas de champ 'message'.");
        }

        if (responseDoc.containsKey("logId")) {
          Serial.print("Log ID : ");
          Serial.println(responseDoc["logId"].as<String>());
        }
      }
    } else {
      Serial.printf("[HTTP] POST... failed, error: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end(); // Fermez la connexion
  }
}

void setup() {
  Serial.begin(115200);

  // Connexion au réseau WiFi client
  Serial.printf("Connecting to %s ", ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" CONNECTED");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Initialiser le bus SPI et le module RC522
  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println("\nScanner une carte RFID...");

  // Initialiser les leds
  pinMode(RED_LED, OUTPUT);  
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);

  // Récupérer les informations de l'ESP32
  String macAddress = WiFi.macAddress();
  String idfVersion = esp_get_idf_version();
  
  Serial.print("ESP-IDF Version: ");
  Serial.println(idfVersion);
  
}

void loop() {
  if (!cardScanned) {
    // Attendre qu'une carte soit présente
    if (!mfrc522.PICC_IsNewCardPresent()) {
      return;
    }

    // Lire les données de la carte
    if (!mfrc522.PICC_ReadCardSerial()) {
      return;
    }

    Serial.print("UID de la carte : ");
    uidRfid = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
      if (i > 0) {
        uidRfid += "-";
      }
      if (mfrc522.uid.uidByte[i] < 0x10) {
        uidRfid += "0";
      }
      uidRfid += String(mfrc522.uid.uidByte[i], HEX);
    }
    Serial.println(uidRfid);
    Serial.println("\nVeuillez entrer votre code PIN sur le clavier...");
    cardScanned = true;
    enteredPin = ""; // Réinitialiser le PIN pour la nouvelle entrée
  } else {
    // Carte scannée, attendre le code PIN
    char customKey = customKeypad.getKey();

    if (customKey) {
      if ((customKey >= '0' && customKey <= '9') || (customKey >= 'A' && customKey <= 'D')) { // Accepter les chiffres et les lettres A-D pour le PIN
        enteredPin += customKey;
        Serial.print(customKey);

        if (enteredPin.length() == PIN_LENGTH) {
          Serial.println("\nPIN completé. Envoi des données...");
          // Envoyer les données au backend
          sendDataToBackend(enteredPin, esp_get_idf_version(), uidRfid);

          // Réinitialiser pour le prochain cycle
          uidRfid = "";
          enteredPin = "";
          cardScanned = false;
          Serial.println("\nScanner une autre carte RFID...");
        }
      } else if (customKey == '#') { // Utiliser # pour annuler ou effacer (exemple simple)
         Serial.println("\nAnnulé. Scanner une autre carte RFID...");
         uidRfid = "";
         enteredPin = "";
         cardScanned = false;
      } else if (customKey == '*') { // Ignorer la touche *
         Serial.println("\nTouche * ignorée.");
      } else { // Pour toute autre touche inattendue
         Serial.println("\nTouche invalide.");
      }
    }
  }

  delay(50); // Petit délai pour éviter de saturer la boucle
}