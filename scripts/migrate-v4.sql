CREATE TABLE IF NOT EXISTS controle_budgetaire (
  id              SERIAL PRIMARY KEY,
  budget_ligne_id INTEGER NOT NULL REFERENCES budget_structure_lignes(id) ON DELETE CASCADE,
  annee           INTEGER NOT NULL,
  mois            INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
  montant_prevu   NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (montant_prevu >= 0),
  montant_realise NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (montant_realise >= 0),
  commentaire     TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (budget_ligne_id, annee, mois)
);
CREATE INDEX IF NOT EXISTS idx_cb_ligne ON controle_budgetaire(budget_ligne_id, annee, mois);
