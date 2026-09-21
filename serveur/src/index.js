import express from 'express';
import { db } from './db.js';

const app = express();
app.use(express.json());
app.use(express.static('../web'));

const PORT = process.env.PORT || 3000;
const CLE_BORNE = process.env.CLE_BORNE || 'changez-moi-avant-la-demo';

// Petit utilitaire : renvoie une erreur au format convenu dans docs/API.md
const erreur = (res, code, nom, message) => res.status(code).json({ erreur: nom, message });


// ===================================================================
//  1. BORNE  ->  SERVEUR
// ===================================================================

// Vérifie la clé partagée et retrouve la borne. Commun aux deux routes borne.
function identifierBorne(req, res) {
  const { uid, borne_id, cle } = req.body ?? {};

  if (!uid || !borne_id) {
    erreur(res, 400, 'requete_invalide', 'uid et borne_id requis');
    return null;
  }
  if (cle !== CLE_BORNE) {
    erreur(res, 401, 'cle_invalide', 'Clé de borne incorrecte');
    return null;
  }

  const borne = db.prepare(`
    SELECT b.id, b.ressource_id, r.nom AS ressource_nom
    FROM bornes b LEFT JOIN ressources r ON r.id = b.ressource_id
    WHERE b.id = ?
  `).get(borne_id);

  if (!borne) {
    erreur(res, 404, 'borne_inconnue', 'Borne non déclarée');
    return null;
  }

  db.prepare("UPDATE bornes SET vue_le = datetime('now') WHERE id = ?").run(borne_id);
  return { uid, borne };
}

function journaliser({ uid, borne, utilisateur = null, autorise, motif = null }) {
  db.prepare(`
    INSERT INTO journal (uid, utilisateur_id, borne_id, ressource_id, autorise, motif_refus)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uid, utilisateur?.id ?? null, borne.id, borne.ressource_id, autorise, motif);
}

app.post('/api/badge', (req, res) => {
  const ctx = identifierBorne(req, res);
  if (!ctx) return;                       // la réponse d'erreur est déjà partie
  const { uid, borne } = ctx;

  const utilisateur = db.prepare('SELECT id, nom FROM utilisateurs WHERE badge_uid = ?').get(uid);

  if (!utilisateur) {
    journaliser({ uid, borne, autorise: 0, motif: 'badge_inconnu' });
    return res.json({
      autorise: false, message: 'Badge inconnu',
      utilisateur: null, ressource: borne.ressource_nom ?? null,
    });
  }

  // Y a-t-il une demande acceptée et non expirée pour cette ressource ?
  const acces = db.prepare(`
    SELECT id FROM demandes
    WHERE utilisateur_id = ? AND ressource_id = ? AND statut = 'acceptee'
      AND (valide_jusqu_a IS NULL OR datetime(valide_jusqu_a) > datetime('now'))
    ORDER BY traite_le DESC LIMIT 1
  `).get(utilisateur.id, borne.ressource_id);

  // Distinguer « jamais autorisé » de « autorisation expirée » : utile pour
  // l'analyse du journal, et ça fait une meilleure réponse en Q&A.
  let motif = null;
  if (!acces) {
    const expiree = db.prepare(`
      SELECT 1 FROM demandes
      WHERE utilisateur_id = ? AND ressource_id = ? AND statut = 'acceptee'
      LIMIT 1
    `).get(utilisateur.id, borne.ressource_id);
    motif = expiree ? 'expiree' : 'pas_d_autorisation';
  }

  journaliser({ uid, borne, utilisateur, autorise: acces ? 1 : 0, motif });

  res.json({
    autorise: Boolean(acces),
    message: acces ? 'Acces autorise' : 'Acces refuse',
    utilisateur: utilisateur.nom,
    ressource: borne.ressource_nom ?? null,
  });
});

app.post('/api/enrolement', (req, res) => {
  const ctx = identifierBorne(req, res);
  if (!ctx) return;
  const { uid, borne } = ctx;

  const attente = db.prepare(`
    SELECT e.utilisateur_id, u.nom FROM enrolement e
    JOIN utilisateurs u ON u.id = e.utilisateur_id
    WHERE e.id = 1 AND e.expire_le > datetime('now')
  `).get();

  if (!attente) {
    return res.json({
      autorise: false, message: 'Aucun enrolement arme',
      utilisateur: null, ressource: borne.ressource_nom ?? null,
    });
  }

  // Un UID ne peut appartenir qu'à une personne : on le retire d'abord d'ailleurs.
  db.prepare('UPDATE utilisateurs SET badge_uid = NULL WHERE badge_uid = ?').run(uid);
  db.prepare('UPDATE utilisateurs SET badge_uid = ? WHERE id = ?').run(uid, attente.utilisateur_id);
  db.prepare('DELETE FROM enrolement WHERE id = 1').run();

  res.json({
    autorise: true, message: 'Badge enregistre',
    utilisateur: attente.nom, ressource: borne.ressource_nom ?? null,
  });
});


// ===================================================================
//  2. ESPACE UTILISATEUR
// ===================================================================

app.get('/api/ressources', (req, res) => {
  res.json(db.prepare('SELECT id, nom, type, description, critique FROM ressources ORDER BY type, nom').all());
});

app.get('/api/utilisateurs', (req, res) => {
  // Pas d'authentification cette semaine : le front propose de choisir qui on est.
  // C'est une limite assumée, à citer devant le jury.
  res.json(db.prepare('SELECT id, nom, role FROM utilisateurs ORDER BY nom').all());
});

app.post('/api/demandes', (req, res) => {
  const { utilisateur_id, ressource_id, motif } = req.body ?? {};

  if (!utilisateur_id || !ressource_id || !motif?.trim()) {
    return erreur(res, 400, 'requete_invalide', 'utilisateur_id, ressource_id et motif requis');
  }
  if (!db.prepare('SELECT 1 FROM utilisateurs WHERE id = ?').get(utilisateur_id)) {
    return erreur(res, 404, 'non_trouve', 'Utilisateur inconnu');
  }
  if (!db.prepare('SELECT 1 FROM ressources WHERE id = ?').get(ressource_id)) {
    return erreur(res, 404, 'non_trouve', 'Ressource inconnue');
  }

  const r = db.prepare(`
    INSERT INTO demandes (utilisateur_id, ressource_id, motif) VALUES (?, ?, ?)
  `).run(utilisateur_id, ressource_id, motif.trim());

  res.status(201).json({ id: r.lastInsertRowid, statut: 'en_attente' });
});

app.get('/api/demandes', (req, res) => {
  const { utilisateur_id } = req.query;
  if (!utilisateur_id) return erreur(res, 400, 'requete_invalide', 'utilisateur_id requis');

  res.json(db.prepare(`
    SELECT d.id, d.motif, d.statut, d.valide_jusqu_a, d.cree_le, d.traite_le,
           r.nom AS ressource, r.type AS ressource_type
    FROM demandes d JOIN ressources r ON r.id = d.ressource_id
    WHERE d.utilisateur_id = ?
    ORDER BY d.cree_le DESC
  `).all(utilisateur_id));
});


// ===================================================================
//  3. PORTAIL ADMIN
// ===================================================================

app.get('/api/admin/demandes', (req, res) => {
  const { statut } = req.query;

  res.json(db.prepare(`
    SELECT d.id, d.motif, d.statut, d.valide_jusqu_a, d.cree_le, d.traite_le,
           u.nom AS utilisateur, u.role,
           r.nom AS ressource, r.type AS ressource_type, r.critique
    FROM demandes d
    JOIN utilisateurs u ON u.id = d.utilisateur_id
    JOIN ressources   r ON r.id = d.ressource_id
    WHERE (? IS NULL OR d.statut = ?)
    ORDER BY d.cree_le DESC
  `).all(statut ?? null, statut ?? null));
});

app.patch('/api/admin/demandes/:id', (req, res) => {
  const { statut, valide_jusqu_a = null, traite_par = null } = req.body ?? {};

  if (!['acceptee', 'refusee'].includes(statut)) {
    return erreur(res, 400, 'requete_invalide', "statut doit valoir 'acceptee' ou 'refusee'");
  }

  const r = db.prepare(`
    UPDATE demandes
    SET statut = ?, valide_jusqu_a = datetime(?), traite_par = ?, traite_le = datetime('now')
    WHERE id = ?
  `).run(statut, valide_jusqu_a, traite_par, req.params.id);

  if (r.changes === 0) return erreur(res, 404, 'non_trouve', 'Demande inconnue');
  res.json({ id: Number(req.params.id), statut, valide_jusqu_a });
});

app.get('/api/admin/journal', (req, res) => {
  const limite = Math.min(Number(req.query.limite) || 100, 500);

  res.json(db.prepare(`
    SELECT j.id, j.horodatage, j.uid, j.autorise, j.motif_refus,
           u.nom AS utilisateur, j.borne_id, r.nom AS ressource
    FROM journal j
    LEFT JOIN utilisateurs u ON u.id = j.utilisateur_id
    LEFT JOIN ressources   r ON r.id = j.ressource_id
    ORDER BY j.horodatage DESC, j.id DESC
    LIMIT ?
  `).all(limite));
});

// Les indicateurs du tableau de bord. C'est ce qui differencie le projet
// d'un simple verrou : on ne controle pas seulement, on analyse.
app.get('/api/admin/statistiques', (req, res) => {
  res.json({
    totaux: db.prepare(`
      SELECT COUNT(*) AS passages,
             SUM(autorise) AS autorises,
             COUNT(*) - SUM(autorise) AS refus
      FROM journal
    `).get(),

    par_ressource: db.prepare(`
      SELECT COALESCE(r.nom, 'Inconnue') AS ressource,
             COUNT(*) AS passages,
             SUM(j.autorise) AS autorises
      FROM journal j LEFT JOIN ressources r ON r.id = j.ressource_id
      GROUP BY r.nom ORDER BY passages DESC
    `).all(),

    par_heure: db.prepare(`
      SELECT strftime('%H', horodatage) AS heure, COUNT(*) AS passages
      FROM journal GROUP BY heure ORDER BY heure
    `).all(),

    // Refus repetes : le signal a surveiller en sante-securite
    refus_repetes: db.prepare(`
      SELECT COALESCE(u.nom, j.uid) AS qui, COUNT(*) AS refus
      FROM journal j LEFT JOIN utilisateurs u ON u.id = j.utilisateur_id
      WHERE j.autorise = 0
      GROUP BY qui HAVING refus >= 3 ORDER BY refus DESC
    `).all(),
  });
});

app.get('/api/admin/utilisateurs', (req, res) => {
  res.json(db.prepare('SELECT id, nom, role, badge_uid, cree_le FROM utilisateurs ORDER BY nom').all());
});

app.post('/api/admin/utilisateurs', (req, res) => {
  const { nom, role } = req.body ?? {};
  if (!nom?.trim() || !['astronaute', 'medecin', 'commandant'].includes(role)) {
    return erreur(res, 400, 'requete_invalide', 'nom requis, role parmi astronaute/medecin/commandant');
  }
  const r = db.prepare('INSERT INTO utilisateurs (nom, role) VALUES (?, ?)').run(nom.trim(), role);
  res.status(201).json({ id: r.lastInsertRowid, nom: nom.trim(), role });
});

app.post('/api/admin/enrolement', (req, res) => {
  const { utilisateur_id } = req.body ?? {};
  if (!db.prepare('SELECT 1 FROM utilisateurs WHERE id = ?').get(utilisateur_id)) {
    return erreur(res, 404, 'non_trouve', 'Utilisateur inconnu');
  }

  // Une seule ligne, id = 1 : un seul enrolement a la fois. Expire en 60 s.
  db.prepare(`
    INSERT INTO enrolement (id, utilisateur_id, expire_le)
    VALUES (1, ?, datetime('now', '+60 seconds'))
    ON CONFLICT(id) DO UPDATE SET
      utilisateur_id = excluded.utilisateur_id,
      expire_le      = excluded.expire_le
  `).run(utilisateur_id);

  res.json({ arme: true, expire_dans_secondes: 60 });
});

app.get('/api/admin/bornes', (req, res) => {
  res.json(db.prepare(`
    SELECT b.id, b.libelle, b.vue_le, b.ressource_id, r.nom AS ressource
    FROM bornes b LEFT JOIN ressources r ON r.id = b.ressource_id
  `).all());
});

app.patch('/api/admin/bornes/:id', (req, res) => {
  const { ressource_id } = req.body ?? {};
  const r = db.prepare('UPDATE bornes SET ressource_id = ? WHERE id = ?')
              .run(ressource_id ?? null, req.params.id);

  if (r.changes === 0) return erreur(res, 404, 'non_trouve', 'Borne inconnue');
  res.json({ id: req.params.id, ressource_id: ressource_id ?? null });
});


app.use((req, res) => erreur(res, 404, 'non_trouve', req.path));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur sur le port ${PORT}`);
});
