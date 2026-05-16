-- ══════════════════════════════════════════════════════════════
--  SeyAmTi Conseil – Migration v2 : nouveaux rôles
--  À exécuter UNE SEULE FOIS sur Neon via la console SQL
-- ══════════════════════════════════════════════════════════════

-- 1. Supprimer l'ancienne contrainte de rôle
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Renommer l'ancien rôle 'user' en 'lecteur' (si existant)
UPDATE users SET role = 'lecteur' WHERE role = 'user';

-- 3. Ajouter la nouvelle contrainte avec les trois rôles
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'editeur', 'lecteur'));

-- 4. Mettre à jour la valeur par défaut
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'lecteur';

-- Vérification
SELECT role, COUNT(*) FROM users GROUP BY role;
