import { getDb } from '@/lib/db';
import { apiError, apiOk } from '@/lib/utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { changePasswordSchema } from '@/lib/validations';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non authentifié', 401);

  const body = await req.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0].message);
  }

  const { currentPassword, newPassword } = parsed.data;
  const sql = getDb();

  const rows = await sql`
    SELECT password_hash FROM users WHERE id = ${parseInt(session.user.id)}
  `;
  if (rows.length === 0) return apiError('Utilisateur non trouvé', 404);

  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash as string);
  if (!valid) return apiError('Mot de passe actuel incorrect', 400);

  const newHash = await bcrypt.hash(newPassword, 10);
  await sql`
    UPDATE users SET password_hash = ${newHash}, updated_at = NOW()
    WHERE id = ${parseInt(session.user.id)}
  `;

  return apiOk({ message: 'Mot de passe modifié avec succès' });
}
