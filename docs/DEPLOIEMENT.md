# Déploiement sur le VPS (Pterodactyl)

Pterodactyl est un **panel web** : pas besoin de SSH, tout se fait depuis le
navigateur. Le panel peut cloner directement le dépôt GitHub.

Ce que ça change pour le projet : la borne n'a plus besoin d'être sur le même
WiFi que le serveur. Elle tape l'adresse publique du panel, donc **un partage
de connexion téléphone suffit le jour de la démo**. C'était le plus gros risque
de la semaine.

## 1. Créer le serveur dans le panel

Choisir l'egg **Node.js (generic)**. Il sait cloner un dépôt Git tout seul.

## 2. Remplir les variables de démarrage (onglet Startup)

| Variable | Valeur |
|---|---|
| `GIT_ADDRESS` | `https://github.com/Genesiith/workshop-b3-badge-acces` |
| `BRANCH` | `main` |
| `MAIN_FILE` | `serveur/src/index.js` |
| `AUTO_UPDATE` | `1` — le panel fait `git pull` à chaque redémarrage |
| `USER_UPLOAD` | `0` |

Avec `AUTO_UPDATE` à `1`, déployer une nouvelle version revient à faire
`git push` puis **Restart** dans le panel. C'est tout.

## 3. Le port

**Ne pas mettre le port en dur.** Pterodactyl attribue une allocation
(adresse + port) et la transmet au programme dans la variable `SERVER_PORT`.
Le code la lit déjà :

```js
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
```

L'adresse publique à utiliser est celle affichée dans l'onglet **Network** du
panel, au format `IP:PORT`.

## 4. La clé de la borne

Ajouter une variable d'environnement `CLE_BORNE` dans le panel, avec une valeur
que vous choisissez. La **même** doit être dans `borne/config.h` :

```c
#define SERVEUR_URL "http://IP-DU-PANEL:PORT/api/badge"
#define CLE_BORNE   "la-meme-valeur-que-dans-le-panel"
```

## 5. Créer la base, une seule fois

Dans la **Console** du panel, serveur arrêté :

```
npm --prefix serveur run init-db
```

Ne le relancez pas ensuite : ça efface toutes les données.

## 6. Vérifier

Ouvrir `http://IP-DU-PANEL:PORT/api/ressources` dans un navigateur. Vous devez
voir du JSON avec les salles et médicaments. Si oui, le serveur est joignable
depuis Internet, et la borne pourra l'atteindre.

---

## Si `npm install` échoue sur better-sqlite3

`better-sqlite3` est un module natif : il se compile à l'installation, et
l'image Node de Pterodactyl n'a pas toujours les outils de compilation.

Si vous voyez une erreur mentionnant `node-gyp`, `python` ou `make` :
dites-le moi, on remplacera la base par une solution sans compilation. Ce n'est
pas bloquant, mais mieux vaut le découvrir aujourd'hui que mercredi.

---

## Limite de sécurité à connaître — important

**Les routes `/api/admin/*` ne sont pas protégées.** Une fois en ligne,
n'importe qui connaissant l'adresse peut valider une demande, lire le journal
ou créer un utilisateur.

C'est acceptable pour une maquette de workshop, mais **il faut le dire avant
que le jury ne le demande** : sur l'axe 4 (pérennité, résilience), savoir
nommer sa propre faille vaut mieux que se la faire trouver.

Mitigation rapide si vous avez le temps mercredi : un en-tête `X-Admin-Token`
comparé à une variable d'environnement, vérifié par un middleware sur
`/api/admin`. Ce n'est pas de l'authentification sérieuse, mais ça ferme la
porte ouverte.

Vraie réponse pour les années à venir : comptes nommés, mots de passe hachés,
sessions, et traçabilité de qui valide quoi — la colonne `traite_par` existe
déjà dans la base pour ça.
