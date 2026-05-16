import { getDb } from '@/lib/db';
import { apiError, apiOk } from '@/lib/utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createUserSchema } from '@/lib/validations';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return apiError('Accès non autorisé', 403);
  }

  const sql = getDb();
  const users = await sql`
    SELECT id, email, nom, prenom, role, created_at
    FROM users
    ORDER BY created_at ASC
  `;
  return apiOk(users);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return apiError('Accès non autorisé', 403);
  }

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0].message);
  }

  const { email, password, nom, prenom, role } = parsed.data;
  const hash = await bcrypt.hash(password, 10);

  const sql = getDb();
  try {
    const rows = await sql`
      INSERT INTO users (email, password_hash, nom, prenom, role)
      VALUES (${email}, ${hash}, ${nom}, ${prenom}, ${role})
      RETURNING id, email, nom, prenom, role, created_at
    `;
    return apiOk(rows[0], 201);
  } catch (err: unknown) {
    console.error('[utilisateurs POST]', err);
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('unique') || msg.includes('23505')) {
      return apiError('Cet email est déjà utilisé', 409);
    }
    return apiError('Erreur serveur', 500);
  }
}
