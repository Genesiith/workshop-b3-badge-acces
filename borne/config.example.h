// Copier ce fichier en config.h et remplir.
// config.h n'est PAS versionné (voir .gitignore) : il contient le mot de passe WiFi.

#ifndef CONFIG_H
#define CONFIG_H

// --- WiFi ---
// Attention : l'ESP8266 ne gère pas les réseaux d'école à identifiant (eduroam)
// ni les portails captifs. Utiliser un partage de connexion téléphone.
#define WIFI_SSID     "nom-du-reseau"
#define WIFI_PASSWORD "mot-de-passe"

// --- Serveur ---
// IP locale du PC qui fait tourner le serveur (ipconfig sous Windows).
// Le PC et l'ESP doivent être sur le MÊME réseau.
#define SERVEUR_URL   "http://192.168.1.10:3000/api/badge"

// --- Identité de la borne ---
#define BORNE_ID      "borne-01"

// Doit être identique à CLE_BORNE dans serveur/.env
#define CLE_BORNE     "changez-moi-avant-la-demo"

#endif
