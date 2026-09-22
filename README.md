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
  │ ESP8266      │                 │   MariaDB    │
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

## Matériel

- NodeMCU ESP8266 (CH340) + breadboard
- Module NFC **PN532** en mode I2C + carte MIFARE
- LED rouge / LED verte, buzzer
- Câbles Dupont M/F
