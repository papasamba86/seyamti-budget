import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { actionSchema } from '@/lib/validations';
import { apiError, apiOk } from '@/lib/utils';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const { searchParams } = new URL(req.url);
  const annee = searchParams.get('annee');

  const sql = getDb();
  const rows = annee
    ? await sql`SELECT * FROM actions WHERE annee = ${parseInt(annee)} ORDER BY created_at DESC`
    : await sql`SELECT * FROM actions ORDER BY created_at DESC`;

  return apiOk(rows);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const { nom, description, annee, statut } = parsed.data;
  const sql = getDb();

  const rows = await sql`
    INSERT INTO actions (nom, description, annee, statut, created_by)
    VALUES (${nom}, ${description}, ${annee}, ${statut}, ${parseInt(session.user.id)})
    RETURNING *
  `;

  return apiOk(rows[0], 201);
}
