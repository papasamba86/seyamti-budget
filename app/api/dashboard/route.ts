import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { apiError, apiOk } from '@/lib/utils';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const { searchParams } = new URL(req.url);
  const annee = parseInt(searchParams.get('annee') ?? String(new Date().getFullYear()));

  const sql = getDb();

  const [actionsStats, budgetStructure, actionsRecentes] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE statut = 'en_cours')::int AS en_cours,
        COUNT(*) FILTER (WHERE statut = 'termine')::int AS termine,
        COUNT(*) FILTER (WHERE statut = 'suspendu')::int AS suspendu
      FROM actions
      WHERE annee = ${annee}
    `,
    sql`
      SELECT
        type_flux,
        SUM(montant)::float AS total
      FROM budget_structure_lignes
      WHERE annee = ${annee}
      GROUP BY type_flux
    `,
    sql`
      SELECT a.id, a.nom, a.statut, a.annee,
        COALESCE(SUM(CASE WHEN bp.type_flux = 'charge' THEN bp.montant ELSE 0 END), 0)::float AS total_charges,
        COALESCE(SUM(CASE WHEN bp.type_flux = 'produit' THEN bp.montant ELSE 0 END), 0)::float AS total_produits
      FROM actions a
      LEFT JOIN budget_previsionnel_lignes bp ON a.id = bp.action_id
      WHERE a.annee = ${annee}
      GROUP BY a.id, a.nom, a.statut, a.annee
      ORDER BY a.created_at DESC
      LIMIT 5
    `,
  ]);

  const structureCharges = (budgetStructure.find(r => r.type_flux === 'charge')?.total as number) ?? 0;
  const structureProduits = (budgetStructure.find(r => r.type_flux === 'produit')?.total as number) ?? 0;

  return apiOk({
    annee,
    actions:  actionsStats[0],
    structure: { charges: structureCharges, produits: structureProduits },
    actionsRecentes,
  });
}
