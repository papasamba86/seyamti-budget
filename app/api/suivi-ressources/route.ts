import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { apiError, apiOk } from '@/lib/utils';

export async function GET(_req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const sql = getDb();

  const actions = await sql`
    SELECT
      a.id, a.nom, a.annee, a.statut,
      COALESCE(r.total_alloue, 0) as total_alloue,
      COALESCE(df.total_fonct, 0) + COALESCE(dp.total_personnel, 0) + COALESCE(ps.total_prest, 0) as total_charges
    FROM actions a
    LEFT JOIN (SELECT action_id, SUM(montant) as total_alloue FROM ressources GROUP BY action_id) r ON r.action_id = a.id
    LEFT JOIN (SELECT action_id, SUM(montant) as total_fonct FROM depenses_fonctionnement GROUP BY action_id) df ON df.action_id = a.id
    LEFT JOIN (SELECT action_id, SUM(montant) as total_personnel FROM depenses_personnel GROUP BY action_id) dp ON dp.action_id = a.id
    LEFT JOIN (SELECT action_id, SUM(montant) as total_prest FROM prestations_services GROUP BY action_id) ps ON ps.action_id = a.id
    ORDER BY a.annee DESC, a.id
  `;

  const ressources = await sql`
    SELECT r.*, a.nom as action_nom FROM ressources r
    JOIN actions a ON a.id = r.action_id
    ORDER BY r.action_id, r.id
  `;

  return apiOk({ actions, ressources });
}
