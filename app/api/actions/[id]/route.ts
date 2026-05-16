import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { actionSchema } from '@/lib/validations';
import { apiError, apiOk } from '@/lib/utils';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const id = parseInt(params.id);
  if (isNaN(id)) return apiError('ID invalide');

  const sql = getDb();
  const rows = await sql`SELECT * FROM actions WHERE id = ${id} LIMIT 1`;
  if (rows.length === 0) return apiError('Action introuvable', 404);

  return apiOk(rows[0]);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const id = parseInt(params.id);
  if (isNaN(id)) return apiError('ID invalide');

  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const { nom, description, annee, statut } = parsed.data;
  const sql = getDb();

  const rows = await sql`
    UPDATE actions
    SET nom = ${nom}, description = ${description}, annee = ${annee},
        statut = ${statut}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  if (rows.length === 0) return apiError('Action introuvable', 404);
  return apiOk(rows[0]);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);
  if (session.user.role !== 'admin') return apiError('Accès refusé', 403);

  const id = parseInt(params.id);
  if (isNaN(id)) return apiError('ID invalide');

  const sql = getDb();
  await sql`DELETE FROM actions WHERE id = ${id}`;
  return apiOk({ message: 'Action supprimée' });
}
