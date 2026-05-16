import { getDb } from '@/lib/db';
import { apiError, apiOk } from '@/lib/utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const updateUserSchema = z.object({
  role:        z.enum(['editeur', 'lecteur']).optional(),
  nom:         z.string().min(1).max(100).trim().optional(),
  prenom:      z.string().min(1).max(100).trim().optional(),
  email:       z.string().email().max(255).optional(),
  newPassword: z.string().min(8).max(100).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return apiError('Accès non autorisé', 403);
  }

  const id = parseInt(params.id);
  if (isNaN(id)) return apiError('ID invalide');

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0].message);
  }

  const sql = getDb();
  const existing = await sql`
    SELECT id, nom, prenom, email, role FROM users WHERE id = ${id}
  `;
  if (existing.length === 0) return apiError('Utilisateur non trouvé', 404);
  if (existing[0].role === 'admin') return apiError('Impossible de modifier un administrateur', 403);

  const u = existing[0];
  const { role, nom, prenom, email, newPassword } = parsed.data;

  const updatedRole   = role   ?? (u.role   as string);
  const updatedNom    = nom    ?? (u.nom    as string);
  const updatedPrenom = prenom ?? (u.prenom as string);
  const updatedEmail  = email  ?? (u.email  as string);

  try {
    const rows = await sql`
      UPDATE users
      SET role = ${updatedRole}, nom = ${updatedNom}, prenom = ${updatedPrenom},
          email = ${updatedEmail}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, email, nom, prenom, role
    `;

    if (newPassword) {
      const hash = await bcrypt.hash(newPassword, 10);
      await sql`UPDATE users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${id}`;
    }

    return apiOk(rows[0]);
  } catch (err: unknown) {
    console.error('[utilisateurs PATCH]', err);
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('unique') || msg.includes('23505')) {
      return apiError('Cet email est déjà utilisé', 409);
    }
    return apiError('Erreur serveur', 500);
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return apiError('Accès non autorisé', 403);
  }

  const id = parseInt(params.id);
  if (isNaN(id)) return apiError('ID invalide');

  if (String(id) === session.user.id) {
    return apiError('Impossible de supprimer votre propre compte', 400);
  }

  const sql = getDb();
  const rows = await sql`
    DELETE FROM users WHERE id = ${id} AND role != 'admin' RETURNING id
  `;

  if (rows.length === 0) {
    return apiError('Utilisateur non trouvé ou impossible de supprimer un admin', 404);
  }

  return apiOk({ deleted: true });
}
