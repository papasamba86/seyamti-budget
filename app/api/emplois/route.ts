import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { emploiSchema } from '@/lib/validations';
import { apiError, apiOk } from '@/lib/utils';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const sql = getDb();
  const rows = await sql`SELECT * FROM emplois_reperes ORDER BY cotation`;
  return apiOk(rows);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);
  if (session.user.role !== 'admin') return apiError('Réservé aux administrateurs', 403);

  const body = await req.json();
  const parsed = emploiSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const { cotation, indice_professionnel, libelle, salaire_annuel } = parsed.data;
  const sql = getDb();

  const rows = await sql`
    INSERT INTO emplois_reperes (cotation, indice_professionnel, libelle, salaire_annuel)
    VALUES (${cotation}, ${indice_professionnel}, ${libelle}, ${salaire_annuel})
    RETURNING *
  `;
  return apiOk(rows[0], 201);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);
  if (session.user.role !== 'admin') return apiError('Réservé aux administrateurs', 403);

  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return apiError('ID requis');

  const parsed = emploiSchema.safeParse(rest);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const { cotation, indice_professionnel, libelle, salaire_annuel } = parsed.data;
  const sql = getDb();

  const rows = await sql`
    UPDATE emplois_reperes
    SET cotation = ${cotation}, indice_professionnel = ${indice_professionnel},
        libelle = ${libelle}, salaire_annuel = ${salaire_annuel}
    WHERE id = ${parseInt(id)}
    RETURNING *
  `;
  if (rows.length === 0) return apiError('Emploi introuvable', 404);
  return apiOk(rows[0]);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);
  if (session.user.role !== 'admin') return apiError('Réservé aux administrateurs', 403);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return apiError('ID requis');

  const sql = getDb();
  await sql`DELETE FROM emplois_reperes WHERE id = ${parseInt(id)}`;
  return apiOk({ message: 'Supprimé' });
}
