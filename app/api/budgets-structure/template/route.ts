import * as XLSX from 'xlsx';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiError } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* ── GET /api/budgets-structure/template ────────────────────── */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return apiError('Non autorisé', 401);

  /* ── Build workbook ── */
  const wb = XLSX.utils.book_new();

  const headers = ['Type de flux', 'Code compte', 'Catégorie', 'Sous-catégorie', 'Montant'];

  const exampleRows = [
    ['Charge',                  '60',   'Achats de matières premières',     'Fournitures de bureau',   12000],
    ['Charge',                  '61',   'Services extérieurs',              'Loyer',                   24000],
    ['Contribution (emploi)',   '64',   'Charges de personnel',             'Salaires bruts',          85000],
    ['Produit',                 '70',   'Ventes de prestations',            'Formations',              95000],
    ['Produit',                 '74',   'Subventions d\'exploitation',      'Subvention État',         30000],
    ['Contribution (ressource)','756',  'Cotisations adhérents',            '',                        10000],
  ];

  const wsData = [headers, ...exampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  /* ── Column widths ── */
  ws['!cols'] = [
    { wch: 26 },   // Type de flux
    { wch: 14 },   // Code compte
    { wch: 38 },   // Catégorie
    { wch: 32 },   // Sous-catégorie
    { wch: 16 },   // Montant
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'BUDGET STRUCTURE');

  /* ── Instructions sheet ── */
  const instrData = [
    ['INSTRUCTIONS D\'IMPORT'],
    [''],
    ['Colonne', 'Valeurs acceptées', 'Obligatoire'],
    ['Type de flux',
      'Charge / Produit / Contribution (emploi) / Contribution (ressource)',
      'Oui'],
    ['Code compte', 'Code comptable (max 10 car.)', 'Non'],
    ['Catégorie', 'Libellé de la catégorie (max 255 car.)', 'Oui'],
    ['Sous-catégorie', 'Libellé du détail (max 255 car.)', 'Non'],
    ['Montant', 'Nombre positif (ex: 1234.56 ou 1 234,56)', 'Non (0 par défaut)'],
    [''],
    ['NOTES :'],
    ['• La première ligne du fichier doit être la ligne d\'en-tête.'],
    ['• L\'onglet doit s\'appeler "BUDGET STRUCTURE" (ou être le premier onglet du fichier).'],
    ['• Le mode "Remplacer" supprime TOUTES les lignes de l\'année avant d\'importer.'],
    ['• Le mode "Ajouter" ajoute les nouvelles lignes sans supprimer les existantes.'],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
  wsInstr['!cols'] = [{ wch: 20 }, { wch: 68 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

  /* ── Write to buffer ── */
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modele_budget_structure.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}
