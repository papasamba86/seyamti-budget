-- ══════════════════════════════════════════════════════════════
--  SeyAmTi / FicheProjet Pro – Migration v6
--  À exécuter via /api/migrate-fiche-projet ou Neon console
-- ══════════════════════════════════════════════════════════════

-- ─── Fiches projet ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fiches_projet (
  id                        SERIAL PRIMARY KEY,
  -- Identification
  titre                     VARCHAR(500) NOT NULL,
  fonds_id                  VARCHAR(100) NOT NULL,
  statut                    VARCHAR(50)  NOT NULL DEFAULT 'brouillon'
                              CHECK (statut IN ('brouillon','en_cours','soumis','valide','refuse','archive')),
  -- Porteur
  type_structure            VARCHAR(100) NOT NULL,
  porteur_nom               VARCHAR(500) NOT NULL DEFAULT '',
  porteur_siret             VARCHAR(20)  NOT NULL DEFAULT '',
  porteur_adresse           TEXT         NOT NULL DEFAULT '',
  porteur_cp                VARCHAR(10)  NOT NULL DEFAULT '',
  porteur_ville             VARCHAR(200) NOT NULL DEFAULT '',
  porteur_contact           VARCHAR(255) NOT NULL DEFAULT '',
  porteur_email             VARCHAR(255) NOT NULL DEFAULT '',
  porteur_telephone         VARCHAR(50)  NOT NULL DEFAULT '',
  -- Projet
  projet_titre              VARCHAR(500) NOT NULL DEFAULT '',
  projet_description        TEXT         NOT NULL DEFAULT '',
  projet_objectifs          TEXT         NOT NULL DEFAULT '',
  projet_territoire         VARCHAR(500) NOT NULL DEFAULT '',
  projet_localisation       VARCHAR(500) NOT NULL DEFAULT '',
  projet_date_debut         DATE,
  projet_date_fin           DATE,
  -- Budget global
  cout_total                NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (cout_total >= 0),
  montant_subvention_demande NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (montant_subvention_demande >= 0),
  taux_subvention           NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (taux_subvention BETWEEN 0 AND 100),
  -- Contexte territorial
  is_qpv                    BOOLEAN NOT NULL DEFAULT FALSE,
  is_npnru                  BOOLEAN NOT NULL DEFAULT FALSE,
  is_domtom                 BOOLEAN NOT NULL DEFAULT FALSE,
  is_zone_rurale            BOOLEAN NOT NULL DEFAULT FALSE,
  is_zone_montagne          BOOLEAN NOT NULL DEFAULT FALSE,
  -- Principes horizontaux (FSE+ obligatoires)
  ph_egalite_hf             BOOLEAN NOT NULL DEFAULT FALSE,
  ph_non_discrimination     BOOLEAN NOT NULL DEFAULT FALSE,
  ph_developpement_durable  BOOLEAN NOT NULL DEFAULT FALSE,
  ph_details                TEXT    NOT NULL DEFAULT '',
  -- Taux forfaitaire indirect
  taux_indirect             NUMERIC(5,2) NOT NULL DEFAULT 20,
  -- Données réglementaires spécifiques (JSONB)
  fonds_data                JSONB,
  -- Méta
  created_by                INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fp_fonds   ON fiches_projet(fonds_id);
CREATE INDEX IF NOT EXISTS idx_fp_statut  ON fiches_projet(statut);
CREATE INDEX IF NOT EXISTS idx_fp_creator ON fiches_projet(created_by);

-- ─── Plan de financement de la fiche ─────────────────────────
CREATE TABLE IF NOT EXISTS fiche_projet_financements (
  id               SERIAL PRIMARY KEY,
  fiche_id         INTEGER       NOT NULL REFERENCES fiches_projet(id) ON DELETE CASCADE,
  financeur        VARCHAR(500)  NOT NULL,
  fonds_id_ref     VARCHAR(100),
  montant          NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (montant >= 0),
  taux             NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (taux BETWEEN 0 AND 100),
  type_financement VARCHAR(100)  NOT NULL DEFAULT '',
  confirme         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fpf_fiche ON fiche_projet_financements(fiche_id);

-- ─── Lignes de budget prévisionnel de la fiche ───────────────
CREATE TABLE IF NOT EXISTS fiche_projet_budget (
  id            SERIAL PRIMARY KEY,
  fiche_id      INTEGER       NOT NULL REFERENCES fiches_projet(id) ON DELETE CASCADE,
  type_depense  VARCHAR(100)  NOT NULL,
  categorie     VARCHAR(255)  NOT NULL,
  libelle       VARCHAR(500)  NOT NULL,
  montant       NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (montant >= 0),
  eligible      BOOLEAN NOT NULL DEFAULT TRUE,
  taux_eligible NUMERIC(5,2)  NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fpb_fiche ON fiche_projet_budget(fiche_id);

-- ─── Pièces justificatives de la fiche ───────────────────────
CREATE TABLE IF NOT EXISTS fiche_projet_pieces (
  id          SERIAL PRIMARY KEY,
  fiche_id    INTEGER      NOT NULL REFERENCES fiches_projet(id) ON DELETE CASCADE,
  code_piece  VARCHAR(100) NOT NULL,
  libelle     VARCHAR(500) NOT NULL,
  statut      VARCHAR(50)  NOT NULL DEFAULT 'requise'
                CHECK (statut IN ('requise','fournie','non_applicable')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fpp_fiche ON fiche_projet_pieces(fiche_id);

-- ─── Trigger updated_at pour fiches_projet ───────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_updated_at_fp'
      AND tgrelid = 'fiches_projet'::regclass
  ) THEN
    CREATE TRIGGER trg_updated_at_fp
      BEFORE UPDATE ON fiches_projet
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
