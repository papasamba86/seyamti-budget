import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ficheProjetSchema } from '@/lib/validations';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statut = searchParams.get('statut');
  const fonds  = searchParams.get('fonds');

  try {
    const sql = getDb();
    let rows;

    if (session.user.role === 'admin') {
      // Admin voit tout
      if (statut && fonds) {
        rows = await sql`
          SELECT fp.*, u.nom || ' ' || u.prenom AS created_by_name
          FROM fiches_projet fp
          LEFT JOIN users u ON fp.created_by = u.id
          WHERE fp.statut = ${statut} AND fp.fonds_id = ${fonds}
          ORDER BY fp.updated_at DESC`;
      } else if (statut) {
        rows = await sql`
          SELECT fp.*, u.nom || ' ' || u.prenom AS created_by_name
          FROM fiches_projet fp
          LEFT JOIN users u ON fp.created_by = u.id
          WHERE fp.statut = ${statut}
          ORDER BY fp.updated_at DESC`;
      } else if (fonds) {
        rows = await sql`
          SELECT fp.*, u.nom || ' ' || u.prenom AS created_by_name
          FROM fiches_projet fp
          LEFT JOIN users u ON fp.created_by = u.id
          WHERE fp.fonds_id = ${fonds}
          ORDER BY fp.updated_at DESC`;
      } else {
        rows = await sql`
          SELECT fp.*, u.nom || ' ' || u.prenom AS created_by_name
          FROM fiches_projet fp
          LEFT JOIN users u ON fp.created_by = u.id
          ORDER BY fp.updated_at DESC`;
      }
    } else {
      // Éditeur / lecteur : uniquement ses fiches
      const userId = parseInt(session.user.id, 10);
      if (statut && fonds) {
        rows = await sql`
          SELECT fp.*, u.nom || ' ' || u.prenom AS created_by_name
          FROM fiches_projet fp
          LEFT JOIN users u ON fp.created_by = u.id
          WHERE fp.created_by = ${userId} AND fp.statut = ${statut} AND fp.fonds_id = ${fonds}
          ORDER BY fp.updated_at DESC`;
      } else {
        rows = await sql`
          SELECT fp.*, u.nom || ' ' || u.prenom AS created_by_name
          FROM fiches_projet fp
          LEFT JOIN users u ON fp.created_by = u.id
          WHERE fp.created_by = ${userId}
          ORDER BY fp.updated_at DESC`;
      }
    }

    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/fiches-projet', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (session.user.role === 'lecteur') {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }); }

  const parsed = ficheProjetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 });
  }

  const d = parsed.data;
  const userId = parseInt(session.user.id, 10);

  try {
    const sql = getDb();
    const rows = await sql`
      INSERT INTO fiches_projet (
        titre, fonds_id, statut, type_structure,
        porteur_nom, porteur_siret, porteur_adresse, porteur_cp, porteur_ville,
        porteur_contact, porteur_email, porteur_telephone,
        projet_titre, projet_description, projet_objectifs,
        projet_territoire, projet_localisation,
        projet_date_debut, projet_date_fin,
        cout_total, montant_subvention_demande, taux_subvention,
        is_qpv, is_npnru, is_domtom, is_zone_rurale, is_zone_montagne,
        ph_egalite_hf, ph_non_discrimination, ph_developpement_durable, ph_details,
        taux_indirect, fonds_data, created_by
      ) VALUES (
        ${d.titre}, ${d.fonds_id}, ${d.statut}, ${d.type_structure},
        ${d.porteur_nom}, ${d.porteur_siret}, ${d.porteur_adresse}, ${d.porteur_cp}, ${d.porteur_ville},
        ${d.porteur_contact}, ${d.porteur_email}, ${d.porteur_telephone},
        ${d.projet_titre}, ${d.projet_description}, ${d.projet_objectifs},
        ${d.projet_territoire}, ${d.projet_localisation},
        ${d.projet_date_debut ?? null}, ${d.projet_date_fin ?? null},
        ${d.cout_total}, ${d.montant_subvention_demande}, ${d.taux_subvention},
        ${d.is_qpv}, ${d.is_npnru}, ${d.is_domtom}, ${d.is_zone_rurale}, ${d.is_zone_montagne},
        ${d.ph_egalite_hf}, ${d.ph_non_discrimination}, ${d.ph_developpement_durable}, ${d.ph_details},
        ${d.taux_indirect}, ${JSON.stringify(d.fonds_data ?? {})}, ${userId}
      ) RETURNING *`;

    const fiche = rows[0];

    // Insérer les financements
    if (d.financements && d.financements.length > 0) {
      for (const f of d.financements) {
        await sql`
          INSERT INTO fiche_projet_financements (fiche_id, financeur, fonds_id_ref, montant, taux, type_financement, confirme)
          VALUES (${fiche.id}, ${f.financeur}, ${f.fonds_id_ref ?? null}, ${f.montant}, ${f.taux}, ${f.type_financement}, ${f.confirme ?? false})
        `;
      }
    }

    // Insérer le budget
    if (d.budget && d.budget.length > 0) {
      for (const b of d.budget) {
        await sql`
          INSERT INTO fiche_projet_budget (fiche_id, type_depense, categorie, libelle, montant, eligible, taux_eligible)
          VALUES (${fiche.id}, ${b.type_depense}, ${b.categorie}, ${b.libelle}, ${b.montant}, ${b.eligible ?? true}, ${b.taux_eligible ?? 100})
        `;
      }
    }

    // Insérer les pièces justificatives
    if (d.pieces && d.pieces.length > 0) {
      for (const p of d.pieces) {
        await sql`
          INSERT INTO fiche_projet_pieces (fiche_id, code_piece, libelle, statut)
          VALUES (${fiche.id}, ${p.code_piece}, ${p.libelle}, ${p.statut ?? 'requise'})
        `;
      }
    }

    return NextResponse.json(fiche, { status: 201 });
  } catch (err) {
    console.error('POST /api/fiches-projet', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
