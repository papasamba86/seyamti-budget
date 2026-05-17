import * as XLSX from 'xlsx';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { apiError } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TYPE_LABELS: Record<string, string> = {
  charge:                 'Charges',
  produit:                'Produits',
  contribution_emploi:    'Contributions – Emplois',
  contribution_ressource: 'Contributions – Ressources',
};

const TYPE_ORDER = ['charge', 'contribution_emploi', 'produit', 'contribution_ressource'];

/* ── GET /api/budgets-structure/export?annee=XXXX ───────────── */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  const { searchParams } = new URL(req.url);
  const anneeRaw = searchParams.get('annee') ?? String(new Date().getFullYear());
  const annee = parseInt(anneeRaw);
  if (isNaN(annee)) return apiError('Année invalide');

  const sql = getDb();
  const rows = await sql`
    SELECT type_flux, code_compte, categorie, sous_categorie, montant, ordre
    FROM budget_structure_lignes
    WHERE annee = ${annee}
    ORDER BY type_flux, ordre, id
  `;

  /* ── Group by type ── */
  const grouped: Record<string, { code: string; cat: string; sous: string; montant: number }[]> = {};
  for (const r of rows) {
    const key = r.type_flux as string;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({
      code:    String(r.code_compte ?? ''),
      cat:     String(r.categorie ?? ''),
      sous:    String(r.sous_categorie ?? ''),
      montant: Number(r.montant ?? 0),
    });
  }

  /* ── Build sheet data ── */
  const wb = XLSX.utils.book_new();
  const sheetRows: (string | number)[][] = [];

  // Title
  sheetRows.push([`Budget de la Structure – Exercice ${annee}`]);
  sheetRows.push([]);
  sheetRows.push(['Type de flux', 'Code compte', 'Catégorie', 'Sous-catégorie', 'Montant (€)']);

  let totalCharges  = 0;
  let totalProduits = 0;

  for (const type of TYPE_ORDER) {
    const lignes = grouped[type];
    if (!lignes || lignes.length === 0) continue;

    // Section header
    sheetRows.push([TYPE_LABELS[type] ?? type, '', '', '', '']);

    let subtotal = 0;
    for (const l of lignes) {
      sheetRows.push(['', l.code, l.cat, l.sous, l.montant]);
      subtotal += l.montant;
    }

    // Subtotal row
    sheetRows.push(['', '', '', `Sous-total ${TYPE_LABELS[type] ?? type}`, subtotal]);
    sheetRows.push([]);

    if (type === 'charge' || type === 'contribution_emploi') totalCharges  += subtotal;
    else                                                       totalProduits += subtotal;
  }

  // Summary
  sheetRows.push([]);
  sheetRows.push(['RÉCAPITULATIF', '', '', '', '']);
  sheetRows.push(['', '', '', 'Total Charges (dépenses)',  totalCharges]);
  sheetRows.push(['', '', '', 'Total Produits (ressources)', totalProduits]);
  sheetRows.push(['', '', '', 'Solde (Produits – Charges)',  totalProduits - totalCharges]);

  const ws = XLSX.utils.aoa_to_sheet(sheetRows);

  // Column widths
  ws['!cols'] = [
    { wch: 30 }, // Type
    { wch: 14 }, // Code
    { wch: 38 }, // Catégorie
    { wch: 34 }, // Sous-catégorie
    { wch: 18 }, // Montant
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Budget Structure');

  /* ── Onglet détail par type ── */
  const detailRows: (string | number)[][] = [];
  detailRows.push([`Détail – Budget de la Structure – Exercice ${annee}`]);
  detailRows.push([]);

  for (const type of TYPE_ORDER) {
    const lignes = grouped[type];
    if (!lignes || lignes.length === 0) continue;
    detailRows.push([TYPE_LABELS[type] ?? type]);
    detailRows.push(['Code compte', 'Catégorie', 'Sous-catégorie', 'Montant (€)']);
    let sub = 0;
    for (const l of lignes) {
      detailRows.push([l.code, l.cat, l.sous, l.montant]);
      sub += l.montant;
    }
    detailRows.push(['', '', 'TOTAL', sub]);
    detailRows.push([]);
  }

  const wsDet = XLSX.utils.aoa_to_sheet(detailRows);
  wsDet['!cols'] = [{ wch: 14 }, { wch: 38 }, { wch: 34 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsDet, 'Détail');

  /* ── Write ── */
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="budget_structure_${annee}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
