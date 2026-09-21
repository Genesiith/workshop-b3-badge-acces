/*
 * Borne de contrôle d'accès — Workshop B3 EPSI
 *
 * Carte    : NodeMCU 1.0 (ESP-12E Module)
 * Lecteur  : PN532 en mode I2C (SDA=D2, SCL=D1)
 * Sorties  : LED verte D6, LED rouge D7, buzzer D5
 *
 * Principe : la borne NE DÉCIDE RIEN. Elle lit l'UID du badge, l'envoie au
 * serveur, et affiche la réponse. Toute la logique d'autorisation est côté
 * serveur, ce qui permet de changer les droits sans reflasher la borne.
 *
 * Librairies : PN532 + PN532_I2C (elechouse), voir README.
 */

#include <Wire.h>
#include <PN532_I2C.h>
#include <PN532.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

#include "config.h"   // copier config.example.h en config.h

// --- Brochage ---
const uint8_t LED_VERTE = D6;
const uint8_t LED_ROUGE = D7;
const uint8_t BUZZER    = D5;

PN532_I2C pn532i2c(Wire);
PN532 nfc(pn532i2c);

// Anti-rebond : ignore le même badge s'il reste devant le lecteur
String dernierUid = "";
unsigned long dernierPassage = 0;
const unsigned long DELAI_MEME_BADGE = 3000;  // ms


void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== Borne de controle d'acces ===");

  pinMode(LED_VERTE, OUTPUT);
  pinMode(LED_ROUGE, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  eteindreTout();

  // --- Lecteur NFC ---
  nfc.begin();
  uint32_t version = nfc.getFirmwareVersion();
  if (!version) {
    Serial.println("ERREUR : PN532 introuvable.");
    Serial.println("-> Verifier les interrupteurs de mode (I2C) puis SDA=D2 / SCL=D1.");
    while (true) {                       // clignote en rouge, ne continue pas
      digitalWrite(LED_ROUGE, !digitalRead(LED_ROUGE));
      delay(300);
    }
  }
  Serial.printf("PN5%02X detecte, firmware %d.%d\n",
                (version >> 24) & 0xFF, (version >> 16) & 0xFF, (version >> 8) & 0xFF);
  nfc.SAMConfig();

  connecterWifi();
  Serial.println("Pret. Approchez un badge.");
}


void loop() {
  if (WiFi.status() != WL_CONNECTED) connecterWifi();

  uint8_t uid[7] = {0};
  uint8_t longueurUid = 0;

  // Timeout de 500 ms : la boucle reste réactive
  if (!nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &longueurUid, 500)) return;

  String uidTexte = uidVersTexte(uid, longueurUid);

  if (uidTexte == dernierUid && millis() - dernierPassage < DELAI_MEME_BADGE) return;
  dernierUid = uidTexte;
  dernierPassage = millis();

  Serial.println("Badge : " + uidTexte);
  bool autorise = demanderAuServeur(uidTexte);
  autorise ? signalerAutorise() : signalerRefuse();
}


// --- Conversion de l'UID en hexadécimal majuscule, sans séparateur ---
String uidVersTexte(uint8_t* uid, uint8_t longueur) {
  String s = "";
  for (uint8_t i = 0; i < longueur; i++) {
    if (uid[i] < 0x10) s += "0";
    s += String(uid[i], HEX);
  }
  s.toUpperCase();
  return s;
}


// --- Appel du serveur. Toute erreur = refus. ---
bool demanderAuServeur(const String& uidTexte) {
  WiFiClient client;
  HTTPClient http;

  if (!http.begin(client, SERVEUR_URL)) {
    Serial.println("HTTP : URL invalide");
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000);

  String corps = String("{\"uid\":\"") + uidTexte +
                 "\",\"borne_id\":\"" + BORNE_ID +
                 "\",\"cle\":\"" + CLE_BORNE + "\"}";

  int code = http.POST(corps);
  String reponse = http.getString();
  http.end();

  Serial.printf("HTTP %d : %s\n", code, reponse.c_str());

  if (code != 200) return false;

  // Réponse courte et de forme connue : une recherche de sous-chaîne suffit.
  // Piste d'amélioration : ArduinoJson, pour lire aussi `message` et l'afficher
  // sur un écran OLED.
  return reponse.indexOf("\"autorise\":true") >= 0;
}


// --- Retours physiques ---
void signalerAutorise() {
  Serial.println("ACCES AUTORISE");
  digitalWrite(LED_VERTE, HIGH);
  bip(80); delay(60); bip(80);
  delay(1500);
  eteindreTout();
}

void signalerRefuse() {
  Serial.println("ACCES REFUSE");
  digitalWrite(LED_ROUGE, HIGH);
  bip(400);
  delay(1500);
  eteindreTout();
}

void bip(uint16_t duree) {          // buzzer ACTIF : simple niveau haut
  digitalWrite(BUZZER, HIGH);
  delay(duree);
  digitalWrite(BUZZER, LOW);
}

void eteindreTout() {
  digitalWrite(LED_VERTE, LOW);
  digitalWrite(LED_ROUGE, LOW);
  digitalWrite(BUZZER, LOW);
}


// --- WiFi ---
void connecterWifi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("WiFi vers " WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long debut = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - debut < 20000) {
    digitalWrite(LED_ROUGE, !digitalRead(LED_ROUGE));
    delay(400);
    Serial.print(".");
  }
  digitalWrite(LED_ROUGE, LOW);

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnecte, IP " + WiFi.localIP().toString());
  } else {
    Serial.println("\nEchec WiFi. Reseau d'ecole ou portail captif ?");
  }
}


/* ------------------------------------------------------------------
 * PISTES D'ÉVOLUTION (à discuter en groupe, bonnes réponses pour le jury)
 *
 * 1. Écran OLED I2C sur D1/D2 : afficher `message` et le nom de la personne.
 * 2. Cache local : garder les derniers badges autorisés en EEPROM pour que la
 *    borne fonctionne en mode dégradé si le serveur tombe.
 * 3. Mode urgence : appui long sur un bouton = déverrouillage tracé + alerte.
 * 4. HTTPS + clé par borne, au lieu d'une clé partagée en clair.
 * ------------------------------------------------------------------ */
