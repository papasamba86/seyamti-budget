import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { apiError, apiOk } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const sql = getDb();

  /*
   * Vue centrée sur la ressource :
   * Une ligne par (financeur, type_financement).
   * Pour chaque ligne : montant global, détail par action avec
   * total des charges de cette action et le restant.
   */
  const rows = await sql`
    WITH charges_par_action AS (
      SELECT
        a.id AS action_id,
        COALESCE(df.s, 0) + COALESCE(dp.s, 0) + COALESCE(ps.s, 0) AS total_charges
      FROM actions a
      LEFT JOIN (
        SELECT action_id, SUM(montant) AS s FROM depenses_fonctionnement GROUP BY action_id
      ) df ON df.action_id = a.id
      LEFT JOIN (
        SELECT action_id, SUM(montant) AS s FROM depenses_personnel GROUP BY action_id
      ) dp ON dp.action_id = a.id
      LEFT JOIN (
        SELECT action_id, SUM(cout_horaire * nb_heures) AS s FROM prestations_services GROUP BY action_id
      ) ps ON ps.action_id = a.id
    )
    SELECT
      r.financeur,
      r.type_financement,
      MIN(r.date_debut)  AS date_debut,
      MAX(r.date_fin)    AS date_fin,
      SUM(r.montant)     AS montant_global,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'action_id',      a.id,
          'action_nom',     a.nom,
          'annee',          a.annee,
          'statut',         a.statut,
          'montant_affecte',r.montant,
          'date_debut',     r.date_debut,
          'date_fin',       r.date_fin,
          'total_charges',  cpa.total_charges
        ) ORDER BY a.nom
      ) AS actions_detail
    FROM ressources r
    JOIN actions          a   ON a.id   = r.action_id
    JOIN charges_par_action cpa ON cpa.action_id = r.action_id
    GROUP BY r.financeur, r.type_financement
    ORDER BY r.financeur
  `;

  /* Totaux globaux */
  const totalAlloue   = rows.reduce((s: number, r) => s + Number(r.montant_global), 0);
  const totalConsomme = rows.reduce((s: number, r) => {
    const detail = (r.actions_detail as { total_charges: number }[]) ?? [];
    return s + detail.reduce((a, d) => a + Number(d.total_charges), 0);
  }, 0);

  return apiOk({ ressources: rows, totalAlloue, totalConsomme });
}
