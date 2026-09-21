-- Schéma de la base — SQLite
-- Recréé à zéro par `npm run init-db`

PRAGMA foreign_keys = ON;

-- Équipage
CREATE TABLE utilisateurs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nom         TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('astronaute', 'medecin', 'commandant')),
  badge_uid   TEXT UNIQUE,              -- NULL tant que le badge n'est pas enrôlé
  cree_le     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ce qui est protégé : salles et médicaments
CREATE TABLE ressources (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nom         TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('salle', 'medicament')),
  description TEXT,
  critique    INTEGER NOT NULL DEFAULT 0   -- 1 = validation médecin obligatoire
);

-- Bornes physiques. Une borne protège une ressource, modifiable depuis l'admin.
CREATE TABLE bornes (
  id           TEXT PRIMARY KEY,           -- ex. 'borne-01', en dur dans config.h
  libelle      TEXT NOT NULL,
  ressource_id INTEGER REFERENCES ressources(id) ON DELETE SET NULL,
  vue_le       TEXT                        -- dernier contact, pour l'état de la borne
);

-- Demandes d'accès faites depuis l'espace utilisateur
CREATE TABLE demandes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  utilisateur_id  INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  ressource_id    INTEGER NOT NULL REFERENCES ressources(id) ON DELETE CASCADE,
  motif           TEXT NOT NULL,
  statut          TEXT NOT NULL DEFAULT 'en_attente'
                    CHECK (statut IN ('en_attente', 'acceptee', 'refusee')),
  valide_jusqu_a  TEXT,                    -- NULL = permanent jusqu'à révocation
  traite_par      INTEGER REFERENCES utilisateurs(id),
  cree_le         TEXT NOT NULL DEFAULT (datetime('now')),
  traite_le       TEXT
);

-- Journal des passages de badge. Une ligne par appel, autorisé ou non.
-- C'est la source de l'analyse santé-sécurité.
CREATE TABLE journal (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  horodatage      TEXT NOT NULL DEFAULT (datetime('now')),
  uid             TEXT NOT NULL,           -- conservé brut : trace les badges inconnus
  utilisateur_id  INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  borne_id        TEXT REFERENCES bornes(id) ON DELETE SET NULL,
  ressource_id    INTEGER REFERENCES ressources(id) ON DELETE SET NULL,
  autorise        INTEGER NOT NULL,        -- 0 / 1
  motif_refus     TEXT                     -- 'badge_inconnu', 'pas_d_autorisation', 'expiree'
);

CREATE INDEX idx_journal_horodatage ON journal(horodatage);
CREATE INDEX idx_journal_utilisateur ON journal(utilisateur_id);
CREATE INDEX idx_demandes_statut ON demandes(statut);

-- Enrôlement armé depuis le portail admin, expire au bout de 60 s
CREATE TABLE enrolement (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
  expire_le      TEXT
);


-- ---------------------------------------------------------------
-- Jeu de données de démonstration
-- ---------------------------------------------------------------

INSERT INTO utilisateurs (nom, role, badge_uid) VALUES
  ('Dr. Sarah Moreau', 'medecin',    NULL),
  ('Cdt. Marc Aubry',  'commandant', NULL),
  ('Léa Fontaine',     'astronaute', NULL),
  ('Tom Vasquez',      'astronaute', NULL);

INSERT INTO ressources (nom, type, description, critique) VALUES
  ('Pharmacie de bord', 'salle',      'Armoire à pharmacie principale',        1),
  ('Laboratoire',       'salle',      'Manipulation de produits chimiques',    1),
  ('Salle de sport',    'salle',      'Séances anti-atrophie',                 0),
  ('Antalgique',        'medicament', 'Traitement de la douleur',              0),
  ('Somnifère',         'medicament', 'Régulation du sommeil, usage encadré',  1);

INSERT INTO bornes (id, libelle, ressource_id) VALUES
  ('borne-01', 'Borne pharmacie', 1);
