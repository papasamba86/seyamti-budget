const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS depenses_fonctionnement (
      id          SERIAL PRIMARY KEY,
      action_id   INTEGER NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
      libelle     VARCHAR(255) NOT NULL,
      code_compte VARCHAR(10)  NOT NULL DEFAULT '',
      montant     NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (montant >= 0),
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_df_action ON depenses_fonctionnement(action_id)
  `;

  console.log('Migration v3 appliquée avec succès : table depenses_fonctionnement créée.');
}

run().catch(console.error);
