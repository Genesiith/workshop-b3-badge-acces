import express from 'express';
import { db } from './db.js';

const app = express();
app.use(express.json());
app.use(express.static('../web'));

const PORT = process.env.PORT || 3000;
const CLE_BORNE = process.env.CLE_BORNE || 'changez-moi-avant-la-demo';

// ===================================================================
//  BORNE  →  SERVEUR
//  Implémenté : c'est le jalon de mardi soir.
// ===================================================================

app.post('/api/badge', (req, res) => {
  const { uid, borne_id, cle } = req.body ?? {};

  if (!uid || !borne_id) {
    return res.status(400).json({ erreur: 'requete_invalide', message: 'uid et borne_id requis' });
  }
  if (cle !== CLE_BORNE) {
    return res.status(401).json({ erreur: 'cle_invalide', message: 'Clé de borne incorrecte' });
  }

  const borne = db.prepare(`
    SELECT b.id, b.ressource_id, r.nom AS ressource_nom
    FROM bornes b LEFT JOIN ressources r ON r.id = b.ressource_id
    WHERE b.id = ?
  `).get(borne_id);

  if (!borne) {
    return res.status(404).json({ erreur: 'borne_inconnue', message: 'Borne non déclarée' });
  }
  db.prepare("UPDATE bornes SET vue_le = datetime('now') WHERE id = ?").run(borne_id);

  const utilisateur = db.prepare('SELECT id, nom FROM utilisateurs WHERE badge_uid = ?').get(uid);

  // Badge inconnu
  if (!utilisateur) {
    journaliser({ uid, borne, autorise: 0, motif: 'badge_inconnu' });
    return res.json({
      autorise: false,
      message: 'Badge inconnu',
      utilisateur: null,
      ressource: borne.ressource_nom ?? null,
    });
  }

  // Une demande acceptée et non expirée pour cette ressource ?
  const acces = db.prepare(`
    SELECT id, valide_jusqu_a FROM demandes
    WHERE utilisateur_id = ? AND ressource_id = ? AND statut = 'acceptee'
      AND (valide_jusqu_a IS NULL OR valide_jusqu_a > datetime('now'))
    ORDER BY traite_le DESC LIMIT 1
  `).get(utilisateur.id, borne.ressource_id);

  const autorise = Boolean(acces);
  journaliser({
    uid, borne, utilisateur, autorise: autorise ? 1 : 0,
    motif: autorise ? null : 'pas_d_autorisation',
  });

  res.json({
    autorise,
    message: autorise ? 'Acces autorise' : 'Acces refuse',
    utilisateur: utilisateur.nom,
    ressource: borne.ressource_nom ?? null,
  });
});

function journaliser({ uid, borne, utilisateur = null, autorise, motif = null }) {
  db.prepare(`
    INSERT INTO journal (uid, utilisateur_id, borne_id, ressource_id, autorise, motif_refus)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uid, utilisateur?.id ?? null, borne.id, borne.ressource_id, autorise, motif);
}

// ===================================================================
//  À FAIRE — voir docs/API.md pour le contrat exact de chaque route
// ===================================================================

// TODO (chantier serveur) : POST /api/enrolement
//   Si un enrôlement est armé et non expiré, associer l'uid à l'utilisateur
//   ciblé, vider la table enrolement, et répondre autorise:true.

// TODO (chantier front user) :
//   GET  /api/ressources
//   POST /api/demandes            { utilisateur_id, ressource_id, motif }
//   GET  /api/demandes?utilisateur_id=

// TODO (chantier front admin) :
//   GET   /api/admin/demandes?statut=en_attente
//   PATCH /api/admin/demandes/:id { statut, valide_jusqu_a }
//   GET   /api/admin/journal?limite=
//   GET   /api/admin/utilisateurs · POST /api/admin/utilisateurs
//   POST  /api/admin/enrolement   { utilisateur_id }
//   PATCH /api/admin/bornes/:id   { ressource_id }

app.use((req, res) => res.status(404).json({ erreur: 'non_trouve', message: req.path }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur sur http://0.0.0.0:${PORT}`);
  console.log("Pensez a mettre l'IP locale de cette machine dans borne/config.h");
});
