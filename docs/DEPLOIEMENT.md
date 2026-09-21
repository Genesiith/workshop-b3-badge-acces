# Déploiement sur le VPS

Le VPS change une chose importante : **la borne n'a plus besoin d'être sur le
même réseau que le serveur.** Elle tape l'IP publique, donc un partage de
connexion téléphone suffit le jour de la démo. C'était le plus gros risque de
la semaine, il disparaît.

## 1. Installer Node

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git
node --version      # doit afficher v22 ou plus
```

## 2. Récupérer le projet

```bash
git clone https://github.com/Genesiith/workshop-b3-badge-acces.git
cd workshop-b3-badge-acces/serveur
npm install
cp .env.example .env
nano .env           # changer CLE_BORNE, c'est le mot de passe de la borne
npm run init-db
```

## 3. Le faire tourner en continu

```bash
sudo npm install -g pm2
pm2 start src/index.js --name borne-acces
pm2 save
pm2 startup         # suivre la commande affichée, pour le redémarrage auto
```

Voir les logs en direct : `pm2 logs borne-acces`

## 4. Ouvrir le port

```bash
sudo ufw allow 3000/tcp
```

Vérifier depuis ton PC : `http://IP-DU-VPS:3000/api/ressources` doit renvoyer
du JSON.

## 5. Configurer la borne

Dans `borne/config.h` :

```c
#define SERVEUR_URL "http://IP-DU-VPS:3000/api/badge"
#define CLE_BORNE   "la-meme-cle-que-dans-.env"
```

### Attention au HTTPS

Si vous mettez un nom de domaine et un certificat, **l'ESP8266 ne suivra pas**
sans travail supplémentaire : il faut soit `client.setInsecure()`, ce qui
supprime la vérification du certificat, soit embarquer l'empreinte du
certificat, qui change à chaque renouvellement.

Le plus simple cette semaine : le **site en HTTPS**, et l'**API borne en HTTP
sur le port 3000**. À citer comme limite connue, avec la piste d'évolution.

---

## Mise à jour après un push

```bash
cd ~/workshop-b3-badge-acces
git pull
cd serveur && npm install
pm2 restart borne-acces
```

`data.db` est dans le `.gitignore` : un `git pull` n'écrase jamais vos données.

---

## Limite de sécurité à connaître — important

**Les routes `/api/admin/*` ne sont pas protégées.** Sur un VPS public, ça veut
dire que n'importe qui connaissant l'URL peut valider une demande, lire le
journal ou créer un utilisateur.

C'est acceptable pour une maquette de workshop, mais **il faut le dire avant
que le jury ne le demande** : sur l'axe 4 (pérennité, résilience), savoir
nommer sa propre faille vaut mieux que se la faire trouver.

Mitigation en 10 minutes si vous avez le temps mercredi : un en-tête
`X-Admin-Token` comparé à une valeur du `.env`, vérifié par un middleware sur
`/api/admin`. Ce n'est pas de l'authentification sérieuse, mais ça ferme la
porte ouverte.

Vraie réponse pour les années à venir : comptes nommés, mots de passe hachés,
sessions, et traçabilité de qui valide quoi — la colonne `traite_par` existe
déjà dans la base pour ça.
