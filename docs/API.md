# Contrat d'API

Base : `http://<ip-serveur>:3000`

**Règle du groupe : ce contrat ne change pas sans accord commun.** Chacun peut
coder de son côté à partir d'ici, sans attendre les autres.

---

## 1. Borne → serveur

### `POST /api/badge`

Appelé par l'ESP8266 à chaque passage de badge. **La borne ne décide rien**,
elle affiche seulement la réponse.

Requête :

```json
{
  "uid": "04A2B3C4",
  "borne_id": "borne-01",
  "cle": "secret-partage"
}
```

| Champ | Type | Description |
|---|---|---|
| `uid` | string | UID du badge en hexadécimal majuscule, sans séparateur |
| `borne_id` | string | Identifiant de la borne, en dur dans `config.h` |
| `cle` | string | Clé partagée, empêche de simuler un badge depuis le réseau |

Réponse `200` :

```json
{
  "autorise": true,
  "message": "Accès autorisé",
  "utilisateur": "A. Durand",
  "ressource": "Pharmacie"
}
```

```json
{
  "autorise": false,
  "message": "Aucune autorisation valide",
  "utilisateur": "A. Durand",
  "ressource": "Pharmacie"
}
```

| Champ | Type | Description |
|---|---|---|
| `autorise` | bool | Seul champ que la borne utilise pour LED + buzzer |
| `message` | string | Court, affichable sur un écran OLED (20 caractères max) |
| `utilisateur` | string\|null | `null` si le badge est inconnu |
| `ressource` | string\|null | Ressource protégée par cette borne |

Erreurs : `401` clé invalide · `404` borne inconnue · `400` requête malformée.
**Dans tous les cas, la borne traite une réponse non-200 comme un refus.**

Le serveur écrit une ligne dans le journal à **chaque** appel, autorisé ou non.

### `POST /api/enrolement`

Mode enrôlement : associer un badge à un utilisateur. L'admin active le mode
depuis le portail, l'astronaute badge, l'UID est enregistré.

Même corps que `/api/badge`. Si un enrôlement est en attente, le serveur
associe l'UID à l'utilisateur ciblé au lieu de vérifier un accès.

---

## 2. Espace utilisateur

### `GET /api/ressources`
Liste des salles et médicaments auxquels on peut demander l'accès.

### `POST /api/demandes`
```json
{ "utilisateur_id": 3, "ressource_id": 2, "motif": "Migraine persistante" }
```
Crée une demande au statut `en_attente`.

### `GET /api/demandes?utilisateur_id=3`
Les demandes de l'utilisateur, avec leur statut.

---

## 3. Portail admin

### `GET /api/admin/demandes?statut=en_attente`
Les demandes à traiter.

### `PATCH /api/admin/demandes/:id`
```json
{ "statut": "acceptee", "valide_jusqu_a": "2026-09-25T18:00:00Z" }
```
`statut` ∈ `acceptee` | `refusee`. `valide_jusqu_a` optionnel : sans date,
l'accès est permanent jusqu'à révocation.

### `GET /api/admin/journal?limite=100`
Le journal des passages : qui, quelle borne, quelle ressource, résultat, date.
**C'est la donnée qui alimente l'analyse SST** (consommations, anomalies,
pics horaires).

### `GET /api/admin/utilisateurs` · `POST /api/admin/utilisateurs`
Gestion de l'équipage.

### `POST /api/admin/enrolement`
```json
{ "utilisateur_id": 3 }
```
Arme le mode enrôlement pour le prochain badge lu. Expire au bout de 60 s.

### `PATCH /api/admin/bornes/:id`
```json
{ "ressource_id": 2 }
```
Change la ressource protégée par une borne. Permet de démontrer plusieurs
scénarios avec une seule borne physique.

---

## Convention d'erreur

```json
{ "erreur": "cle_invalide", "message": "Clé de borne incorrecte" }
```

Codes : `cle_invalide`, `borne_inconnue`, `badge_inconnu`, `requete_invalide`,
`non_trouve`.
