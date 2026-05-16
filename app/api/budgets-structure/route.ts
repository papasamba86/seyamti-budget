import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { budgetStructureLigneSchema } from '@/lib/validations';
import { apiError, apiOk } from '@/lib/utils';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const { searchParams } = new URL(req.url);
  const annee = searchParams.get('annee') ?? new Date().getFullYear().toString();

  const sql = getDb();
  const rows = await sql`
    SELECT * FROM budget_structure_lignes
    WHERE annee = ${parseInt(annee)}
    ORDER BY type_flux, ordre, id
  `;
  return apiOk(rows);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const body = await req.json();
  const parsed = budgetStructureLigneSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const { type_flux, code_compte, categorie, sous_categorie, montant, ordre } = parsed.data;
  const annee = body.annee ?? new Date().getFullYear();
  const sql = getDb();

  const rows = await sql`
    INSERT INTO budget_structure_lignes
      (annee, type_flux, code_compte, categorie, sous_categorie, montant, ordre, created_by)
    VALUES
      (${annee}, ${type_flux}, ${code_compte ?? ''}, ${categorie},
       ${sous_categorie ?? ''}, ${montant}, ${ordre}, ${parseInt(session.user.id)})
    RETURNING *
  `;
  return apiOk(rows[0], 201);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return apiError('ID requis');

  const parsed = budgetStructureLigneSchema.safeParse(rest);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const { type_flux, code_compte, categorie, sous_categorie, montant, ordre } = parsed.data;
  const sql = getDb();

  const rows = await sql`
    UPDATE budget_structure_lignes
    SET type_flux = ${type_flux}, code_compte = ${code_compte ?? ''},
        categorie = ${categorie}, sous_categorie = ${sous_categorie ?? ''},
        montant = ${montant}, ordre = ${ordre}, updated_at = NOW()
    WHERE id = ${parseInt(id)}
    RETURNING *
  `;
  if (rows.length === 0) return apiError('Ligne introuvable', 404);
  return apiOk(rows[0]);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return apiError('ID requis');

  const sql = getDb();
  await sql`DELETE FROM budget_structure_lignes WHERE id = ${parseInt(id)}`;
  return apiOk({ message: 'Supprimé' });
}
