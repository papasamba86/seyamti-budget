import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';

// Migration exécutée en statements séparés (neon ne supporte pas unsafe())
const MIGRATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS fiches_projet (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(500) NOT NULL,
    fonds_id VARCHAR(100) NOT NULL,
    statut VARCHAR(50) NOT NULL DEFAULT 'brouillon',
    type_structure VARCHAR(100) NOT NULL,
    porteur_nom VARCHAR(500) NOT NULL DEFAULT '',
    porteur_siret VARCHAR(20) NOT NULL DEFAULT '',
    porteur_adresse TEXT NOT NULL DEFAULT '',
    porteur_cp VARCHAR(10) NOT NULL DEFAULT '',
    porteur_ville VARCHAR(200) NOT NULL DEFAULT '',
    porteur_contact VARCHAR(255) NOT NULL DEFAULT '',
    porteur_email VARCHAR(255) NOT NULL DEFAULT '',
    porteur_telephone VARCHAR(50) NOT NULL DEFAULT '',
    projet_titre VARCHAR(500) NOT NULL DEFAULT '',
    projet_description TEXT NOT NULL DEFAULT '',
    projet_objectifs TEXT NOT NULL DEFAULT '',
    projet_territoire VARCHAR(500) NOT NULL DEFAULT '',
    projet_localisation VARCHAR(500) NOT NULL DEFAULT '',
    projet_date_debut DATE,
    projet_date_fin DATE,
    cout_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    montant_subvention_demande NUMERIC(15,2) NOT NULL DEFAULT 0,
    taux_subvention NUMERIC(5,2) NOT NULL DEFAULT 0,
    is_qpv BOOLEAN NOT NULL DEFAULT FALSE,
    is_npnru BOOLEAN NOT NULL DEFAULT FALSE,
    is_domtom BOOLEAN NOT NULL DEFAULT FALSE,
    is_zone_rurale BOOLEAN NOT NULL DEFAULT FALSE,
    is_zone_montagne BOOLEAN NOT NULL DEFAULT FALSE,
    ph_egalite_hf BOOLEAN NOT NULL DEFAULT FALSE,
    ph_non_discrimination BOOLEAN NOT NULL DEFAULT FALSE,
    ph_developpement_durable BOOLEAN NOT NULL DEFAULT FALSE,
    ph_details TEXT NOT NULL DEFAULT '',
    taux_indirect NUMERIC(5,2) NOT NULL DEFAULT 20,
    fonds_data JSONB,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS fiche_projet_financements (
    id SERIAL PRIMARY KEY,
    fiche_id INTEGER NOT NULL REFERENCES fiches_projet(id) ON DELETE CASCADE,
    financeur VARCHAR(500) NOT NULL,
    fonds_id_ref VARCHAR(100),
    montant NUMERIC(15,2) NOT NULL DEFAULT 0,
    taux NUMERIC(5,2) NOT NULL DEFAULT 0,
    type_financement VARCHAR(100) NOT NULL DEFAULT '',
    confirme BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS fiche_projet_budget (
    id SERIAL PRIMARY KEY,
    fiche_id INTEGER NOT NULL REFERENCES fiches_projet(id) ON DELETE CASCADE,
    type_depense VARCHAR(100) NOT NULL,
    categorie VARCHAR(255) NOT NULL,
    libelle VARCHAR(500) NOT NULL,
    montant NUMERIC(15,2) NOT NULL DEFAULT 0,
    eligible BOOLEAN NOT NULL DEFAULT TRUE,
    taux_eligible NUMERIC(5,2) NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS fiche_projet_pieces (
    id SERIAL PRIMARY KEY,
    fiche_id INTEGER NOT NULL REFERENCES fiches_projet(id) ON DELETE CASCADE,
    code_piece VARCHAR(100) NOT NULL,
    libelle VARCHAR(500) NOT NULL,
    statut VARCHAR(50) NOT NULL DEFAULT 'requise',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_fp_fonds ON fiches_projet(fonds_id)`,
  `CREATE INDEX IF NOT EXISTS idx_fp_statut ON fiches_projet(statut)`,
  `CREATE INDEX IF NOT EXISTS idx_fp_creator ON fiches_projet(created_by)`,
  `CREATE INDEX IF NOT EXISTS idx_fpf_fiche ON fiche_projet_financements(fiche_id)`,
  `CREATE INDEX IF NOT EXISTS idx_fpb_fiche ON fiche_projet_budget(fiche_id)`,
  `CREATE INDEX IF NOT EXISTS idx_fpp_fiche ON fiche_projet_pieces(fiche_id)`,
];

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ error: 'DATABASE_URL manquant' }, { status: 500 });

  try {
    const sql = neon(url);
    for (const stmt of MIGRATION_STATEMENTS) {
      await sql(stmt);
    }
    return NextResponse.json({ ok: true, message: `Migration FicheProjet exécutée (${MIGRATION_STATEMENTS.length} instructions).` });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
