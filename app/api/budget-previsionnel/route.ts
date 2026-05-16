import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { budgetLigneSchema } from '@/lib/validations';
import { apiError, apiOk } from '@/lib/utils';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const { searchParams } = new URL(req.url);
  const actionId = searchParams.get('action_id');
  if (!actionId) return apiError('action_id requis');

  const sql = getDb();
  const rows = await sql`
    SELECT * FROM budget_previsionnel_lignes
    WHERE action_id = ${parseInt(actionId)}
    ORDER BY type_flux, ordre, id
  `;
  return apiOk(rows);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const body = await req.json();
  const parsed = budgetLigneSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const { action_id, type_flux, code_compte, categorie, sous_categorie, montant, ordre } = parsed.data;
  if (!action_id) return apiError('action_id requis');

  const sql = getDb();
  const rows = await sql`
    INSERT INTO budget_previsionnel_lignes
      (action_id, type_flux, code_compte, categorie, sous_categorie, montant, ordre)
    VALUES
      (${action_id}, ${type_flux}, ${code_compte ?? ''}, ${categorie},
       ${sous_categorie ?? ''}, ${montant}, ${ordre})
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

  const parsed = budgetLigneSchema.safeParse(rest);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const { type_flux, code_compte, categorie, sous_categorie, montant, ordre } = parsed.data;
  const sql = getDb();

  const rows = await sql`
    UPDATE budget_previsionnel_lignes
    SET type_flux = ${type_flux}, code_compte = ${code_compte ?? ''},
        categorie = ${categorie}, sous_categorie = ${sous_categorie ?? ''},
        montant = ${montant}, ordre = ${ordre}
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
  await sql`DELETE FROM budget_previsionnel_lignes WHERE id = ${parseInt(id)}`;
  return apiOk({ message: 'Supprimé' });
}
