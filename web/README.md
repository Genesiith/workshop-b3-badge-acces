# Front

Servi en statique par le serveur : `http://<ip-serveur>:3000`.
Pas de build, pas de framework imposé — le plus rapide gagne cette semaine.

## Deux espaces

### Espace utilisateur — `index.html`
- Choisir son identité (pas d'authentification cette semaine, c'est assumé)
- Demander l'accès à une ressource, avec un motif
- Suivre l'état de ses demandes

### Portail admin — `admin.html`
- Traiter les demandes en attente : accepter, refuser, durée de validité
- Enrôler un badge : armer le mode, faire badger, l'UID est associé
- Consulter le journal des accès
- Changer la ressource protégée par une borne

## Le journal, c'est l'argument du pitch

Le verrou, tout le monde en fait un. Ce qui différencie le projet, c'est
l'exploitation du journal : consommations par médicament, refus répétés,
pics horaires, zones à incidents. Prévoyez au moins un graphique ou deux
compteurs sur le portail admin — c'est ce qui se voit en 5 minutes de
soutenance.

## Routes

Voir [`../docs/API.md`](../docs/API.md). Le contrat ne change pas sans accord
du groupe.
