# Déploiement SeyAmTi Conseil – Guide complet

## ✅ État du déploiement
- **URL de production** : https://seyamti-budget.vercel.app
- **Build** : Succès (19 routes)
- **NEXTAUTH_SECRET** : Configuré ✓
- **NEXTAUTH_URL** : Configuré ✓
- **DATABASE_URL** : À configurer ⚠️

---

## Étape 1 : Créer la base de données Neon

1. Allez sur https://console.neon.tech
2. Créez un nouveau projet (ex: `seyamti-budget`)
3. Copiez la **Connection string** (DATABASE_URL) dans les paramètres du projet
   - Format : `postgres://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`

---

## Étape 2 : Configurer DATABASE_URL sur Vercel

Dans le terminal, depuis ce dossier :

```bash
cd "C:\Users\papa-samba.mbaye\Desktop\Appli budgetaire"
vercel env add DATABASE_URL production
# Collez votre DATABASE_URL quand invité
```

Ou directement dans le dashboard Vercel :
1. Allez sur https://vercel.com/papasamba86s-projects/seyamti-budget/settings/environment-variables
2. Ajoutez `DATABASE_URL` avec votre URL Neon

---

## Étape 3 : Exécuter la migration SQL

Dans la console Neon (https://console.neon.tech) :
1. Ouvrez votre projet > **SQL Editor**
2. Copiez et collez le contenu de `scripts/migrate.sql`
3. Cliquez **Run**

Cela créera toutes les tables et insérera les emplois repères initiaux.

---

## Étape 4 : Redéployer pour activer DATABASE_URL

```bash
vercel --prod
```

---

## Étape 5 : Créer le premier administrateur

1. Allez sur https://seyamti-budget.vercel.app/setup
2. Créez le compte administrateur (prénom, nom, email, mot de passe)
3. Connectez-vous sur https://seyamti-budget.vercel.app/login

---

## Structure de l'application

| Route | Description |
|-------|-------------|
| `/login` | Page de connexion |
| `/setup` | Configuration initiale (premier admin) |
| `/dashboard` | Tableau de bord |
| `/dashboard/budget-structure` | Budget de la structure |
| `/dashboard/actions` | Gestion des actions/projets |
| `/dashboard/actions/[id]` | Détail action : Budget prévis., Dépenses, Prestations, Ressources |
| `/dashboard/emplois` | Grille emplois repères |

---

## Sécurité mise en place

- ✅ Mots de passe chiffrés avec **bcrypt** (12 rounds)
- ✅ **Requêtes SQL paramétrées** (protection injection SQL)
- ✅ **JWT** en HttpOnly cookies (next-auth)
- ✅ **CSRF protection** (next-auth intégré)
- ✅ **Validation Zod** sur toutes les entrées
- ✅ **En-têtes sécurité** : X-Frame-Options, CSP, X-Content-Type-Options
- ✅ **Middleware** de protection des routes

---

## Commandes utiles

```bash
# Développement local
vercel env pull .env.local   # Récupérer les variables Vercel en local
npm run dev                  # Démarrer en développement

# Déploiement
vercel --prod                # Redéployer en production

# Voir les variables
vercel env ls
```
