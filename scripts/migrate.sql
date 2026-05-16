-- ══════════════════════════════════════════════════════════════
--  SeyAmTi Conseil – Schéma de base de données
--  À exécuter une seule fois sur Neon via la console SQL
-- ══════════════════════════════════════════════════════════════

-- Extension pour UUID (optionnelle)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Table des utilisateurs ────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nom           VARCHAR(100) NOT NULL,
  prenom        VARCHAR(100) NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─── Budget de la structure ────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget_structure_lignes (
  id              SERIAL PRIMARY KEY,
  annee           INTEGER      NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  type_flux       VARCHAR(50)  NOT NULL CHECK (type_flux IN (
                    'charge', 'produit',
                    'contribution_emploi', 'contribution_ressource'
                  )),
  code_compte     VARCHAR(10)  NOT NULL DEFAULT '',
  categorie       VARCHAR(255) NOT NULL,
  sous_categorie  VARCHAR(255) NOT NULL DEFAULT '',
  montant         NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (montant >= 0),
  ordre           INTEGER      NOT NULL DEFAULT 0,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bsl_annee ON budget_structure_lignes(annee);

-- ─── Actions / Projets ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS actions (
  id          SERIAL PRIMARY KEY,
  nom         VARCHAR(255) NOT NULL,
  description TEXT         NOT NULL DEFAULT '',
  annee       INTEGER      NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  statut      VARCHAR(50)  NOT NULL DEFAULT 'en_cours'
                CHECK (statut IN ('en_cours', 'termine', 'suspendu')),
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actions_annee ON actions(annee);

-- ─── Budget prévisionnel par action ───────────────────────────
CREATE TABLE IF NOT EXISTS budget_previsionnel_lignes (
  id              SERIAL PRIMARY KEY,
  action_id       INTEGER      NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  type_flux       VARCHAR(50)  NOT NULL CHECK (type_flux IN (
                    'charge', 'produit',
                    'contribution_emploi', 'contribution_ressource'
                  )),
  code_compte     VARCHAR(10)  NOT NULL DEFAULT '',
  categorie       VARCHAR(255) NOT NULL,
  sous_categorie  VARCHAR(255) NOT NULL DEFAULT '',
  montant         NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (montant >= 0),
  ordre           INTEGER      NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bpl_action ON budget_previsionnel_lignes(action_id);

-- ─── Emplois repères ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emplois_reperes (
  id                    SERIAL PRIMARY KEY,
  cotation              INTEGER       NOT NULL,
  indice_professionnel  INTEGER       NOT NULL,
  libelle               VARCHAR(255)  NOT NULL,
  salaire_annuel        NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (salaire_annuel >= 0),
  UNIQUE (cotation, indice_professionnel)
);

-- ─── Dépenses de personnel ────────────────────────────────────
CREATE TABLE IF NOT EXISTS depenses_personnel (
  id                       SERIAL PRIMARY KEY,
  action_id                INTEGER NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  emploi_id                INTEGER NOT NULL REFERENCES emplois_reperes(id),
  agent_nom                VARCHAR(255) NOT NULL DEFAULT '',
  pourcentage_affectation  NUMERIC(5,4) NOT NULL CHECK (pourcentage_affectation BETWEEN 0 AND 1),
  heures                   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (heures >= 0),
  montant                  NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (montant >= 0),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dp_action ON depenses_personnel(action_id);

-- ─── Prestations de services ──────────────────────────────────
CREATE TABLE IF NOT EXISTS prestations_services (
  id            SERIAL PRIMARY KEY,
  action_id     INTEGER       NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  libelle       VARCHAR(255)  NOT NULL,
  cout_horaire  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cout_horaire >= 0),
  nb_heures     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (nb_heures >= 0),
  montant       NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (montant >= 0),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ps_action ON prestations_services(action_id);

-- ─── Ressources / Financeurs ──────────────────────────────────
CREATE TABLE IF NOT EXISTS ressources (
  id                SERIAL PRIMARY KEY,
  action_id         INTEGER      NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  financeur         VARCHAR(255) NOT NULL,
  montant           NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (montant >= 0),
  type_financement  VARCHAR(100) NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ress_action ON ressources(action_id);

-- ══════════════════════════════════════════════════════════════
--  Données initiales – Emplois repères (grille ECLAT)
-- ══════════════════════════════════════════════════════════════
INSERT INTO emplois_reperes (cotation, indice_professionnel, libelle, salaire_annuel)
VALUES
  (4,  324, 'Assistant administratif',                                                         24000.00),
  (6,  350, 'Chargé d''accueil et d''animation',                                              26000.00),
  (7,  354, 'Assistant de gestion',                                                            26500.00),
  (8,  359, 'Chargé de documentation',                                                        27000.00),
  (10, 389, 'Chargé d''information et de communication, assistant direction et financier',    29500.00),
  (11, 398, 'Assistant informatique, conseiller de niveau 1',                                  30500.00),
  (12, 442, 'Conseiller niveau 2',                                                             35802.00),
  (14, 488, 'Chargé de projet',                                                                39528.00),
  (15, 548, 'Responsable de secteur',                                                          44000.00),
  (16, 608, 'Directeur',                                                                       50000.00)
ON CONFLICT (cotation, indice_professionnel) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
--  Trigger : mise à jour automatique de updated_at
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['users', 'budget_structure_lignes', 'actions'] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_updated_at ON %I;
      CREATE TRIGGER trg_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', tbl, tbl);
  END LOOP;
END $$;
