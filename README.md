# Contrôle d'accès par badge NFC — Pilier 1 (Santé)

Workshop B3 — EPSI 2026-2027

Système de contrôle d'accès aux **médicaments** et aux **zones sensibles** d'un
vaisseau spatial. L'équipage s'identifie par badge NFC devant une borne. Le
médecin de bord accorde ou refuse les accès depuis un portail web. Chaque
passage de badge est tracé.

## Le problème

Sur une mission longue, l'accès à la pharmacie de bord et aux zones à risque
(labo, zone de radiation) n'est ni contrôlé ni tracé. On ne sait pas qui a pris
quel médicament, ni quand. Pas de contrôle d'aptitude avant l'entrée en zone
dangereuse.

## Le parcours de démonstration

1. L'astronaute badge devant la borne pharmacie → **refusé**, LED rouge
2. Depuis le site, il demande l'accès à un médicament, avec un motif
3. L'admin (médecin de bord) valide depuis son portail
4. Il rebadge → **autorisé**, LED verte
5. Le passage apparaît dans le journal d'accès

## Architecture

```
  ┌──────────────┐    HTTP/WiFi    ┌──────────────┐
  │    BORNE     │ ──────────────► │   SERVEUR    │
  │ ESP8266      │                 │ Node + SQLite│
  │ + PN532      │ ◄────────────── │              │
  │ + LED/buzzer │   autorise:     └──────┬───────┘
  └──────────────┘   true / false         │ API REST
                                          │
                              ┌───────────┴───────────┐
                              │                       │
                      ┌───────▼──────┐       ┌────────▼───────┐
                      │ Espace user  │       │ Portail admin  │
                      │ demander     │       │ valider, gérer │
                      │ suivre       │       │ journal        │
                      └──────────────┘       └────────────────┘
```

**La borne ne décide rien.** Elle lit l'UID du badge, l'envoie au serveur, et
affiche la réponse. Toute la logique d'autorisation est côté serveur.

## Contrat d'API

C'est le contrat entre les trois chantiers. **Il ne change pas sans accord du
groupe.** Détail complet dans [`docs/API.md`](docs/API.md).

```http
POST /api/badge
Content-Type: application/json

{ "uid": "04A2B3C4", "borne_id": "borne-01", "cle": "secret-partage" }
```

```json
{ "autorise": true, "message": "Accès autorisé", "utilisateur": "A. Durand", "ressource": "Pharmacie" }
```

## Arborescence

```
serveur/     API REST Node.js + SQLite — autorisations, demandes, journal
docs/        Câblage, API, déploiement, journal de bord
```

## Démarrage rapide

Le serveur tourne sur le **VPS, via le panel Pterodactyl** : la borne n'a donc
pas besoin d'être sur le même réseau, un partage de connexion téléphone suffit
le jour de la démo.
Voir [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md).

### Serveur, en local pour développer

```bash
cd serveur
npm install
cp .env.example .env     # ajuster CLE_BORNE et PORT
npm run init-db          # crée la base à partir de schema.sql
npm start                # http://localhost:3000
```

### Borne

1. Arduino IDE → carte **NodeMCU 1.0 (ESP-12E Module)**
2. Librairies : `PN532`, `PN532_I2C` (elechouse), `NDEF` (Don Coleman)
3. `cp borne/config.example.h borne/config.h` puis renseigner WiFi + IP serveur
4. Téléverser `borne/borne.ino`, moniteur série à **115200**

Brochage détaillé : [`docs/CABLAGE.md`](docs/CABLAGE.md)

## Répartition

| Chantier | Responsable | Fichiers |
|---|---|---|
| Borne (firmware) | à définir | `borne/` |
| Serveur + base | à définir | `serveur/` |
| Front user + admin | à définir | `web/` |
| Doc + pitch | à définir | `docs/` |

## Jalons

- **Lundi** — validation coach, dépôt créé, contrat d'API figé, lecture d'UID OK
- **Mardi soir** — parcours complet : badge → serveur → LED verte/rouge
  (liste de badges en dur, peu importe que ce soit moche)
- **Mercredi** — demandes, validation admin, enrôlement des badges, journal
- **Jeudi** — tests, dossier technique, nettoyage du dépôt, vidéo chrono
- **Vendredi** — pitch et répétition

## Matériel

- NodeMCU ESP8266 (CH340) + breadboard
- Module NFC **PN532** en mode I2C + carte MIFARE
- LED rouge / LED verte, buzzer
- Câbles Dupont M/F

## Limites connues

À assumer devant le jury, avec les pistes d'évolution :

- **UID copiable** — l'UID d'une MIFARE Classic se clone facilement.
  Évolution : authentification cryptographique, ou badge sur téléphone Android
  (le PN532 gère le mode HCE).
- **Clé partagée en clair** — la borne s'authentifie par une clé statique en
  HTTP. Évolution : HTTPS + clé par borne, rotation.
- **Dépendance au serveur** — si le serveur tombe, plus aucun accès.
  Évolution : cache local des badges autorisés sur l'ESP.
- **Routes admin non protégées** — sur un VPS public, l'API admin est ouverte.
  Voir `docs/DEPLOIEMENT.md`. Évolution : comptes nommés et sessions.
- **Mode urgence** — à implémenter : si l'admin ne répond pas et qu'il y a
  urgence vitale, déverrouillage tracé avec alerte.
