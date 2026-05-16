import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { depenseFonctionnementSchema } from '@/lib/validations';
import { apiError, apiOk } from '@/lib/utils';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const { searchParams } = new URL(req.url);
  const actionId = searchParams.get('action_id');
  if (!actionId) return apiError('action_id requis');

  const sql = getDb();
  const rows = await sql`
    SELECT * FROM depenses_fonctionnement
    WHERE action_id = ${parseInt(actionId)}
    ORDER BY id
  `;
  return apiOk(rows);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const body = await req.json();
  const parsed = depenseFonctionnementSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const { action_id, libelle, code_compte, montant } = parsed.data;
  const sql = getDb();

  const rows = await sql`
    INSERT INTO depenses_fonctionnement (action_id, libelle, code_compte, montant)
    VALUES (${action_id}, ${libelle}, ${code_compte ?? ''}, ${montant})
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

  const parsed = depenseFonctionnementSchema.safeParse(rest);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const { action_id, libelle, code_compte, montant } = parsed.data;
  const sql = getDb();

  const rows = await sql`
    UPDATE depenses_fonctionnement
    SET action_id = ${action_id}, libelle = ${libelle},
        code_compte = ${code_compte ?? ''}, montant = ${montant}
    WHERE id = ${parseInt(id)}
    RETURNING *
  `;
  if (rows.length === 0) return apiError('Dépense introuvable', 404);
  return apiOk(rows[0]);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return apiError('ID requis');

  const sql = getDb();
  await sql`DELETE FROM depenses_fonctionnement WHERE id = ${parseInt(id)}`;
  return apiOk({ message: 'Supprimé' });
}
