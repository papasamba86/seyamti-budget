-- Migration v3 : table depenses_fonctionnement (charges hors personnel)
CREATE TABLE IF NOT EXISTS depenses_fonctionnement (
  id          SERIAL PRIMARY KEY,
  action_id   INTEGER NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  libelle     VARCHAR(255) NOT NULL,
  code_compte VARCHAR(10)  NOT NULL DEFAULT '',
  montant     NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (montant >= 0),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_df_action ON depenses_fonctionnement(action_id);
