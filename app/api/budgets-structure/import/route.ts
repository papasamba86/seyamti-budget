import * as XLSX from 'xlsx';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { apiError, apiOk } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* ── Type normalisation ─────────────────────────────────────── */
const TYPE_MAP: Record<string, string> = {
  // French labels
  'charge':                  'charge',
  'charges':                 'charge',
  'produit':                 'produit',
  'produits':                'produit',
  'contribution emploi':     'contribution_emploi',
  'contribution (emploi)':   'contribution_emploi',
  'contribution_emploi':     'contribution_emploi',
  'contributions emploi':    'contribution_emploi',
  'contributions – emplois': 'contribution_emploi',
  'contributions - emplois': 'contribution_emploi',
  'contribution ressource':          'contribution_ressource',
  'contribution (ressource)':        'contribution_ressource',
  'contribution_ressource':          'contribution_ressource',
  'contributions ressource':         'contribution_ressource',
  'contributions – ressources':      'contribution_ressource',
  'contributions - ressources':      'contribution_ressource',
};

function normalizeType(val: unknown): string | null {
  const s = String(val ?? '').toLowerCase().trim();
  return TYPE_MAP[s] ?? null;
}

function parseAmount(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  // Handle strings like "1 234,56" or "1234.56"
  const str = String(val).replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : Math.max(0, n);
}

/* ── POST /api/budgets-structure/import ─────────────────────── */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  try {
    const formData = await req.formData();
    const file    = formData.get('file')  as File   | null;
    const anneeRaw = formData.get('annee') as string | null;
    const mode    = (formData.get('mode') as string) || 'append';

    if (!file) return apiError('Fichier requis');

    const annee = parseInt(anneeRaw ?? String(new Date().getFullYear()));
    if (isNaN(annee) || annee < 2000 || annee > 2100) return apiError('Année invalide');

    /* ── Parse Excel ── */
    const buffer   = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    // Prefer sheet named "BUDGET STRUCTURE" or "Budget Structure", else first sheet
    const targetSheet =
      workbook.SheetNames.find(n => n.toUpperCase().includes('BUDGET') && n.toUpperCase().includes('STRUCT')) ??
      workbook.SheetNames[0];

    if (!targetSheet) return apiError('Aucune feuille trouvée dans le fichier');

    const sheet = workbook.Sheets[targetSheet];
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (rawRows.length < 2) return apiError('Le fichier ne contient pas assez de données (au moins une ligne d\'en-tête + une ligne de données)');

    /* ── Detect header row ── */
    const headerRow = (rawRows[0] as unknown[]).map(h => String(h ?? '').toLowerCase().trim());

    const colIdx = {
      type:     headerRow.findIndex(h => ['type', 'type de flux', 'type_flux', 'flux'].includes(h)),
      code:     headerRow.findIndex(h => ['code', 'code compte', 'code_compte', 'compte'].includes(h)),
      cat:      headerRow.findIndex(h => ['catégorie', 'categorie', 'category', 'libellé', 'libelle'].includes(h)),
      sousCat:  headerRow.findIndex(h => ['sous-catégorie', 'sous_catégorie', 'sous-categorie', 'sous_categorie', 'sous catégorie', 'detail', 'détail'].includes(h)),
      montant:  headerRow.findIndex(h => ['montant', 'amount', 'budget', 'budget annuel', 'annuel'].includes(h)),
    };

    // Fallback to positional columns if headers not found
    const idx = {
      type:    colIdx.type    >= 0 ? colIdx.type    : 0,
      code:    colIdx.code    >= 0 ? colIdx.code    : 1,
      cat:     colIdx.cat     >= 0 ? colIdx.cat     : 2,
      sousCat: colIdx.sousCat >= 0 ? colIdx.sousCat : 3,
      montant: colIdx.montant >= 0 ? colIdx.montant : 4,
    };

    /* ── Parse data rows ── */
    type ParsedLine = {
      type_flux: string; code_compte: string;
      categorie: string; sous_categorie: string;
      montant: number; ordre: number;
    };

    const lines: ParsedLine[] = [];
    const errors: string[] = [];

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i] as unknown[];

      const rawType   = row[idx.type];
      const rawCode   = String(row[idx.code]    ?? '').trim().substring(0, 10);
      const rawCat    = String(row[idx.cat]     ?? '').trim();
      const rawSous   = String(row[idx.sousCat] ?? '').trim();
      const rawMontant= row[idx.montant];

      // Skip blank rows
      if (!rawType && !rawCat) continue;

      const typeFlux = normalizeType(rawType);
      if (!typeFlux) {
        errors.push(`Ligne ${i + 1} : type "${rawType}" non reconnu — valeurs attendues : Charge, Produit, Contribution emploi, Contribution ressource`);
        continue;
      }

      if (!rawCat) {
        errors.push(`Ligne ${i + 1} : catégorie vide ignorée`);
        continue;
      }

      const montant = parseAmount(rawMontant);

      lines.push({
        type_flux:     typeFlux,
        code_compte:   rawCode,
        categorie:     rawCat.substring(0, 255),
        sous_categorie: rawSous.substring(0, 255),
        montant,
        ordre: lines.length,
      });
    }

    if (lines.length === 0) {
      return apiError(
        errors.length > 0
          ? `Aucune ligne valide. Erreurs : ${errors.slice(0, 3).join(' | ')}`
          : 'Aucune ligne de données valide trouvée dans le fichier'
      );
    }

    /* ── Persist to DB ── */
    const sql = getDb();
    const userId = parseInt(session.user.id);

    if (mode === 'replace') {
      await sql`DELETE FROM budget_structure_lignes WHERE annee = ${annee}`;
    }

    for (const line of lines) {
      await sql`
        INSERT INTO budget_structure_lignes
          (annee, type_flux, code_compte, categorie, sous_categorie, montant, ordre, created_by)
        VALUES
          (${annee}, ${line.type_flux}, ${line.code_compte}, ${line.categorie},
           ${line.sous_categorie}, ${line.montant}, ${line.ordre}, ${userId})
      `;
    }

    return apiOk({
      inserted:  lines.length,
      errors,
      sheetUsed: targetSheet,
      message:   `${lines.length} ligne(s) importée(s) avec succès depuis l'onglet « ${targetSheet} ».`,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return apiError(`Erreur lors de l'import : ${msg}`, 500);
  }
}
