import { getDb } from '@/lib/db';
import { apiOk, apiError } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    const sql = getDb();

    await sql`
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
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_cb_ligne ON controle_budgetaire(budget_ligne_id, annee, mois)
    `;

    return apiOk({ message: 'Migration v4 appliquée avec succès : table controle_budgetaire créée.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return apiError(`Migration v4 échouée : ${message}`, 500);
  }
}
