# Livrables et évaluation

## À rendre

- [ ] **Prototype fonctionnel**, même simplifié
- [ ] **Code source** — archive ZIP de ce dépôt Git
- [ ] **Dossier technique** en **PDF**
- [ ] **Support de présentation** en **PPTX**
- [ ] **Vidéo chrono de démonstration**, 1 minute, en **MP4**
- [ ] Tous éléments nécessaires à la compréhension du prototype

Soutenance : **5 min de présentation + 5 min de questions-réponses**.

## Règle sur l'IA — à lire par tout le groupe

> L'IA ne doit pas être à l'initiative de l'idée du projet.
> Si le jury ou le coach vous interroge, **vous devez pouvoir expliquer chaque
> ligne de votre code**.

Conséquence concrète : avant jeudi, chacun relit le code des chantiers qu'il n'a
pas écrits. Si une ligne n'est claire pour personne, on la réécrit à notre
façon ou on la supprime. Un bout de code que personne ne sait défendre coûte
plus cher en Q&A qu'il ne rapporte.

## Grilles de notation

### Locale

| Axe | Ce qui le sert dans ce projet |
|---|---|
| 1. Pertinence & impact | Traçabilité de la pharmacie, contrôle d'accès aux zones à risque |
| 2. Faisabilité & qualité du prototype | Le parcours complet marche en démo, sans bidouille |
| 3. Innovation & complexité technique | Chaîne NFC → WiFi → API → web, décision centralisée |
| 4. Pérennité, résilience & maintenabilité | Cache local, mode urgence, bornes reconfigurables, dépôt propre |
| 5. Qualité documentaire & Q&A | Ce dépôt, le dossier technique, et savoir expliquer son code |

### Nationale

| Axe | Ce qui le sert |
|---|---|
| 1. Pertinence & impact mission ESA 2080 | Mission de plusieurs décennies : l'accès aux soins doit être encadré ET tracé |
| 2. Innovation & différenciation | L'analyse du journal d'accès, pas seulement le verrou |
| 3. Qualité & performance du prototype | Temps de réponse, comportement quand le serveur tombe |
| 4. Pitch, démonstration & conviction | Le parcours en 4 étapes, répété |

## Pistes d'évolution à présenter

Le sujet demande explicitement **des pistes d'amélioration pour les années à
venir**, le projet devant évoluer avec le vaisseau. À préparer :

- Authentification forte : badge cryptographique, ou téléphone Android en mode
  HCE (le PN532 le gère)
- Mode dégradé : cache des badges autorisés dans l'ESP si le serveur tombe
- Mode urgence vitale : déverrouillage tracé avec alerte différée
- Analyse du journal : détection d'anomalies de consommation, pics horaires,
  zones à incidents
- Interconnexion avec les autres projets du vaisseau via l'API
