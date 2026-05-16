import { getDb } from '@/lib/db';
import { registerSchema } from '@/lib/validations';
import { apiError, apiOk } from '@/lib/utils';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`SELECT COUNT(*)::int AS cnt FROM users`;
    return apiOk({ hasUsers: rows[0].cnt > 0 });
  } catch {
    return apiOk({ hasUsers: false });
  }
}

export async function POST(req: Request) {
  try {
    const sql = getDb();

    const rows = await sql`SELECT COUNT(*)::int AS cnt FROM users`;
    if (rows[0].cnt > 0) {
      return apiError('Un administrateur existe déjà. Utilisez la page de connexion.', 403);
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse({ ...body, role: 'admin' });
    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message);
    }

    const { email, password, nom, prenom, role } = parsed.data;
    const hash = await bcrypt.hash(password, 10);

    await sql`
      INSERT INTO users (email, password_hash, nom, prenom, role)
      VALUES (${email}, ${hash}, ${nom}, ${prenom}, ${role})
    `;

    return apiOk({ message: 'Administrateur créé avec succès' }, 201);
  } catch (err: unknown) {
    console.error('[setup POST]', err);
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('23505')) {
      return apiError('Cet email est déjà utilisé', 409);
    }
    if (msg.includes('check') || msg.includes('23514')) {
      return apiError('Valeur de rôle invalide', 400);
    }
    return apiError(`Erreur serveur: ${msg}`, 500);
  }
}
