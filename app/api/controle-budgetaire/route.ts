import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { controleSchema } from '@/lib/validations';
import { apiError, apiOk } from '@/lib/utils';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const { searchParams } = new URL(req.url);
  const anneeParam = searchParams.get('annee');
  const moisParam = searchParams.get('mois');

  if (!anneeParam || !moisParam) return apiError('annee et mois requis');

  const annee = parseInt(anneeParam);
  const mois = parseInt(moisParam);

  if (isNaN(annee) || isNaN(mois)) return apiError('annee et mois doivent être des nombres');

  const sql = getDb();
  const rows = await sql`
    SELECT
      bsl.id, bsl.code_compte, bsl.categorie, bsl.sous_categorie,
      bsl.montant as montant_annuel,
      cb.id as controle_id,
      cb.montant_prevu,
      cb.montant_realise,
      cb.commentaire
    FROM budget_structure_lignes bsl
    LEFT JOIN controle_budgetaire cb
      ON cb.budget_ligne_id = bsl.id AND cb.annee = ${annee} AND cb.mois = ${mois}
    WHERE bsl.annee = ${annee}
      AND bsl.type_flux IN ('charge', 'contribution_emploi')
    ORDER BY bsl.ordre, bsl.id
  `;
  return apiOk(rows);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const body = await req.json();
  const parsed = controleSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const { budget_ligne_id, annee, mois, montant_prevu, montant_realise, commentaire } = parsed.data;
  const sql = getDb();

  const rows = await sql`
    INSERT INTO controle_budgetaire (budget_ligne_id, annee, mois, montant_prevu, montant_realise, commentaire)
    VALUES (${budget_ligne_id}, ${annee}, ${mois}, ${montant_prevu}, ${montant_realise}, ${commentaire ?? ''})
    ON CONFLICT (budget_ligne_id, annee, mois) DO UPDATE
      SET montant_realise = EXCLUDED.montant_realise,
          commentaire = EXCLUDED.commentaire,
          updated_at = NOW()
    RETURNING *
  `;
  return apiOk(rows[0], 201);
}
