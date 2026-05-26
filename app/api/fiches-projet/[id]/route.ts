import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ficheProjetSchema } from '@/lib/validations';

type Ctx = { params: { id: string } };

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT fp.*, u.nom || ' ' || u.prenom AS created_by_name
      FROM fiches_projet fp
      LEFT JOIN users u ON fp.created_by = u.id
      WHERE fp.id = ${id}`;

    if (rows.length === 0) return NextResponse.json({ error: 'Fiche introuvable' }, { status: 404 });

    const fiche = rows[0];

    // Vérification accès (non-admin : uniquement ses fiches)
    if (session.user.role !== 'admin' && String(fiche.created_by) !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Charger financements, budget, pièces
    const [financements, budget, pieces] = await Promise.all([
      sql`SELECT * FROM fiche_projet_financements WHERE fiche_id = ${id} ORDER BY id`,
      sql`SELECT * FROM fiche_projet_budget        WHERE fiche_id = ${id} ORDER BY id`,
      sql`SELECT * FROM fiche_projet_pieces        WHERE fiche_id = ${id} ORDER BY id`,
    ]);

    return NextResponse.json({ ...fiche, financements, budget, pieces });
  } catch (err) {
    console.error('GET /api/fiches-projet/[id]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (session.user.role === 'lecteur') return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });

  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }); }

  const parsed = ficheProjetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const sql = getDb();

    // Vérifier existence + accès
    const existing = await sql`SELECT created_by FROM fiches_projet WHERE id = ${id}`;
    if (existing.length === 0) return NextResponse.json({ error: 'Fiche introuvable' }, { status: 404 });
    if (session.user.role !== 'admin' && String(existing[0].created_by) !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const d = parsed.data;

    const rows = await sql`
      UPDATE fiches_projet SET
        titre = ${d.titre},
        fonds_id = ${d.fonds_id},
        statut = ${d.statut},
        type_structure = ${d.type_structure},
        porteur_nom = ${d.porteur_nom},
        porteur_siret = ${d.porteur_siret},
        porteur_adresse = ${d.porteur_adresse},
        porteur_cp = ${d.porteur_cp},
        porteur_ville = ${d.porteur_ville},
        porteur_contact = ${d.porteur_contact},
        porteur_email = ${d.porteur_email},
        porteur_telephone = ${d.porteur_telephone},
        projet_titre = ${d.projet_titre},
        projet_description = ${d.projet_description},
        projet_objectifs = ${d.projet_objectifs},
        projet_territoire = ${d.projet_territoire},
        projet_localisation = ${d.projet_localisation},
        projet_date_debut = ${d.projet_date_debut ?? null},
        projet_date_fin = ${d.projet_date_fin ?? null},
        cout_total = ${d.cout_total},
        montant_subvention_demande = ${d.montant_subvention_demande},
        taux_subvention = ${d.taux_subvention},
        is_qpv = ${d.is_qpv},
        is_npnru = ${d.is_npnru},
        is_domtom = ${d.is_domtom},
        is_zone_rurale = ${d.is_zone_rurale},
        is_zone_montagne = ${d.is_zone_montagne},
        ph_egalite_hf = ${d.ph_egalite_hf},
        ph_non_discrimination = ${d.ph_non_discrimination},
        ph_developpement_durable = ${d.ph_developpement_durable},
        ph_details = ${d.ph_details},
        taux_indirect = ${d.taux_indirect},
        fonds_data = ${JSON.stringify(d.fonds_data ?? {})}
      WHERE id = ${id}
      RETURNING *`;

    // Remplacer financements, budget, pièces
    await sql`DELETE FROM fiche_projet_financements WHERE fiche_id = ${id}`;
    await sql`DELETE FROM fiche_projet_budget        WHERE fiche_id = ${id}`;
    await sql`DELETE FROM fiche_projet_pieces        WHERE fiche_id = ${id}`;

    if (d.financements && d.financements.length > 0) {
      for (const f of d.financements) {
        await sql`
          INSERT INTO fiche_projet_financements (fiche_id, financeur, fonds_id_ref, montant, taux, type_financement, confirme)
          VALUES (${id}, ${f.financeur}, ${f.fonds_id_ref ?? null}, ${f.montant}, ${f.taux}, ${f.type_financement}, ${f.confirme ?? false})`;
      }
    }

    if (d.budget && d.budget.length > 0) {
      for (const b of d.budget) {
        await sql`
          INSERT INTO fiche_projet_budget (fiche_id, type_depense, categorie, libelle, montant, eligible, taux_eligible)
          VALUES (${id}, ${b.type_depense}, ${b.categorie}, ${b.libelle}, ${b.montant}, ${b.eligible ?? true}, ${b.taux_eligible ?? 100})`;
      }
    }

    if (d.pieces && d.pieces.length > 0) {
      for (const p of d.pieces) {
        await sql`
          INSERT INTO fiche_projet_pieces (fiche_id, code_piece, libelle, statut)
          VALUES (${id}, ${p.code_piece}, ${p.libelle}, ${p.statut ?? 'requise'})`;
      }
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('PUT /api/fiches-projet/[id]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (session.user.role === 'lecteur') return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });

  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

  try {
    const sql = getDb();
    const existing = await sql`SELECT created_by FROM fiches_projet WHERE id = ${id}`;
    if (existing.length === 0) return NextResponse.json({ error: 'Fiche introuvable' }, { status: 404 });
    if (session.user.role !== 'admin' && String(existing[0].created_by) !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    await sql`DELETE FROM fiches_projet WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/fiches-projet/[id]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
