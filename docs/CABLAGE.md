# Câblage de la borne

## Matériel

- NodeMCU ESP8266 (puce USB CH340) monté sur breadboard
- Module NFC **PN532** (carte rouge, antenne sur le pourtour) en **mode I2C**
- Carte / badge MIFARE
- LED verte, LED rouge, chacune avec une résistance 220 Ω
- Buzzer actif
- Câbles Dupont mâle/femelle

## Mode du PN532

Le PN532 a deux micro-interrupteurs qui choisissent l'interface. Le tableau est
imprimé sur la carte. Pour l'**I2C** : interrupteur 1 sur `ON`, interrupteur 2
sur `OFF`. **Vérifier sur la sérigraphie de la carte avant de brancher.**

## Brochage

| Composant | Broche composant | Broche NodeMCU | GPIO |
|---|---|---|---|
| PN532 | VCC | `3V3` | — |
| PN532 | GND | `G` | — |
| PN532 | SDA | `D2` | GPIO4 |
| PN532 | SCL | `D1` | GPIO5 |
| LED verte | anode (+ résistance 220 Ω) | `D6` | GPIO12 |
| LED rouge | anode (+ résistance 220 Ω) | `D7` | GPIO13 |
| Buzzer actif | + | `D5` | GPIO14 |
| LED / buzzer | cathode / − | `G` | — |

### Broches à ne pas utiliser

| Broche | Pourquoi |
|---|---|
| `D3` (GPIO0) | Doit être HIGH au démarrage — sinon mode flash |
| `D4` (GPIO2) | Doit être HIGH au démarrage, LED intégrée |
| `D8` (GPIO15) | Doit être LOW au démarrage |
| `D0` (GPIO16) | Pas d'interruption, pas de pull-up — sortie simple uniquement |
| `RX` / `TX` | Utilisées par le moniteur série |

### Écran OLED (optionnel, fortement recommandé)

Un OLED I2C (SSD1306, 0.96") se branche sur **les mêmes broches `D1`/`D2`** :
l'I2C est un bus, plusieurs composants le partagent. Adresses distinctes
(PN532 = `0x24`, OLED = `0x3C`), pas de conflit.

Ça change beaucoup l'impression en soutenance : la borne affiche
« Accès autorisé — Pharmacie » au lieu de clignoter en vert.

## Alimentation

Le PN532 tire peu de courant, le `3V3` du NodeMCU suffit en lecture de badge.
Si le module redémarre ou que la lecture devient instable, alimenter le PN532
en 5 V depuis `VIN` (USB) — **masse commune obligatoire**, et faire valider le
montage par le coach.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| Aucun port COM dans l'IDE | Driver CH340 non installé |
| `Didn't find PN53x board` | Interrupteurs de mode, ou SDA/SCL inversés |
| Lecture aléatoire | Alimentation faible, ou câbles Dupont trop longs |
| Reboot en boucle | Broche interdite utilisée (D3, D4, D8) |
| WiFi ne se connecte pas | Réseau d'école (eduroam) ou portail captif — utiliser un partage de connexion |

## Test de validation

Exemple `iso14443a_uid` de la librairie PN532, interface I2C sélectionnée en
tête du fichier, moniteur série à **115200**. Passer la carte : l'UID doit
s'afficher. Noter cet UID, c'est le premier badge à insérer en base.
