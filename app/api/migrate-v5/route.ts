import { getDb } from '@/lib/db';
import { apiError, apiOk } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/* POST /api/migrate-v5  — ajoute date_debut / date_fin sur ressources */
export async function POST() {
  try {
    const sql = getDb();
    await sql`ALTER TABLE ressources ADD COLUMN IF NOT EXISTS date_debut DATE`;
    await sql`ALTER TABLE ressources ADD COLUMN IF NOT EXISTS date_fin   DATE`;
    return apiOk({ message: 'Migration v5 OK — colonnes date_debut/date_fin ajoutées.' });
  } catch (err: unknown) {
    return apiError(`Migration échouée : ${err instanceof Error ? err.message : String(err)}`, 500);
  }
}
