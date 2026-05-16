const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);

  const steps = [
    `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`,
    `UPDATE users SET role = 'lecteur' WHERE role = 'user'`,
    `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'editeur', 'lecteur'))`,
    `ALTER TABLE users ALTER COLUMN role SET DEFAULT 'lecteur'`,
  ];

  for (const stmt of steps) {
    try {
      await sql([stmt]);
      console.log('OK:', stmt.substring(0, 70));
    } catch (e) {
      console.error('ERR:', stmt.substring(0, 70), '->', e.message);
    }
  }

  const check = await sql`SELECT role, COUNT(*)::int AS cnt FROM users GROUP BY role ORDER BY role`;
  console.log('Utilisateurs par rôle:', check);
  console.log('Migration v2 terminée.');
}

run().catch(console.error);
