'use client';
import { useState, useEffect, useRef, FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { formatMontant } from '@/lib/utils';

interface Ligne {
  id: number;
  type_flux: string;
  code_compte: string;
  categorie: string;
  sous_categorie: string;
  montant: number;
  ordre: number;
}

const TYPE_OPTIONS = [
  { value: 'charge',                label: 'Charge' },
  { value: 'produit',               label: 'Produit' },
  { value: 'contribution_emploi',   label: 'Contribution (emploi)' },
  { value: 'contribution_ressource',label: 'Contribution (ressource)' },
];

const TYPE_LABELS: Record<string, string> = {
  charge:                 'Charges',
  produit:                'Produits',
  contribution_emploi:    'Contributions – Emplois',
  contribution_ressource: 'Contributions – Ressources',
};

const DEPENSES_TYPES  = ['charge', 'contribution_emploi'];
const RESSOURCES_TYPES = ['produit', 'contribution_ressource'];

const empty = { type_flux: 'charge', code_compte: '', categorie: '', sous_categorie: '', montant: 0, ordre: 0 };

/* ── Import modal state ── */
interface ImportResult {
  inserted: number;
  errors: string[];
  sheetUsed: string;
  message: string;
}

function BudgetStructureContent() {
  const annee = new Date().getFullYear();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab');
  const activeTab: 'ressources' | 'depenses' = tabParam === 'ressources' ? 'ressources' : 'depenses';

  const [lignes, setLignes]   = useState<Ligne[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Ligne | null>(null);
  const [form, setForm]       = useState({ ...empty });
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  /* ── Import state ── */
  const [importModal, setImportModal]     = useState(false);
  const [importAnnee, setImportAnnee]     = useState(annee);
  const [importMode, setImportMode]       = useState<'append' | 'replace'>('append');
  const [importFile, setImportFile]       = useState<File | null>(null);
  const [importing, setImporting]         = useState(false);
  const [importErr, setImportErr]         = useState('');
  const [importResult, setImportResult]   = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = () => {
    setLoading(true);
    fetch(`/api/budgets-structure?annee=${annee}`)
      .then(r => r.json())
      .then(data => { setLignes(data); setLoading(false); });
  };

  useEffect(reload, [annee]);

  function openAdd() {
    setEditing(null);
    const defaultType = activeTab === 'ressources' ? 'produit' : 'charge';
    setForm({ ...empty, type_flux: defaultType });
    setErr('');
    setModal(true);
  }

  function openEdit(l: Ligne) {
    setEditing(l);
    setForm({ type_flux: l.type_flux, code_compte: l.code_compte, categorie: l.categorie,
              sous_categorie: l.sous_categorie, montant: l.montant, ordre: l.ordre });
    setErr('');
    setModal(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr('');

    const payload = editing
      ? { id: editing.id, ...form, annee }
      : { ...form, annee };

    const res = await fetch('/api/budgets-structure', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, montant: parseFloat(String(payload.montant)) }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error ?? 'Erreur'); return; }
    setModal(false);
    reload();
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cette ligne ?')) return;
    await fetch(`/api/budgets-structure?id=${id}`, { method: 'DELETE' });
    reload();
  }

  /* ── Import handlers ── */
  function openImport() {
    setImportFile(null);
    setImportAnnee(annee);
    setImportMode('append');
    setImportErr('');
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = '';
    setImportModal(true);
  }

  async function handleImport(e: FormEvent) {
    e.preventDefault();
    if (!importFile) { setImportErr('Veuillez sélectionner un fichier.'); return; }
    setImporting(true);
    setImportErr('');
    setImportResult(null);

    const fd = new FormData();
    fd.append('file', importFile);
    fd.append('annee', String(importAnnee));
    fd.append('mode', importMode);

    try {
      const res  = await fetch('/api/budgets-structure/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setImportErr(data.error ?? 'Erreur lors de l\'import');
      } else {
        setImportResult(data);
        reload();
      }
    } catch {
      setImportErr('Erreur réseau. Veuillez réessayer.');
    } finally {
      setImporting(false);
    }
  }

  const grouped = lignes.reduce<Record<string, Ligne[]>>((acc, l) => {
    (acc[l.type_flux] ??= []).push(l);
    return acc;
  }, {});

  const visibleTypes = activeTab === 'ressources' ? RESSOURCES_TYPES : DEPENSES_TYPES;

  const totalCharges  = (grouped.charge ?? []).reduce((s, l) => s + l.montant, 0)
    + (grouped.contribution_emploi ?? []).reduce((s, l) => s + l.montant, 0);
  const totalProduits = (grouped.produit ?? []).reduce((s, l) => s + l.montant, 0)
    + (grouped.contribution_ressource ?? []).reduce((s, l) => s + l.montant, 0);

  const tabTotal = activeTab === 'ressources' ? totalProduits : totalCharges;

  function setTab(tab: 'ressources' | 'depenses') {
    router.push(`/dashboard/budget-structure?tab=${tab}`);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget de la Structure</h1>
          <p className="text-sm text-gray-500">Exercice {annee}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openImport} className="btn-secondary flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Importer Excel
          </button>
          <button onClick={openAdd} className="btn-primary">+ Ajouter une ligne</button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['depenses', 'ressources'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setTab(tab)}
            className={`px-5 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab
                ? 'bg-navy text-white border-navy border-b-0'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab === 'depenses' ? 'Dépenses' : 'Ressources'}
          </button>
        ))}
      </div>

      {/* Solde */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Charges',  val: totalCharges,                color: 'text-red-600' },
          { label: 'Total Produits', val: totalProduits,               color: 'text-green-600' },
          { label: 'Solde',          val: totalProduits - totalCharges, color: totalProduits - totalCharges >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-xs font-medium text-gray-500 uppercase">{s.label}</p>
            <p className={`mt-1 text-xl font-bold ${s.color}`}>{formatMontant(s.val)}</p>
          </div>
        ))}
      </div>

      {/* Tab total */}
      <div className="text-sm text-gray-500">
        Total {activeTab === 'depenses' ? 'dépenses' : 'ressources'} :{' '}
        <span className="font-semibold text-gray-800">{formatMontant(tabTotal)}</span>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Chargement...</p>
      ) : lignes.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          Aucune ligne budgétaire. Cliquez sur &quot;Ajouter une ligne&quot; ou importez un fichier Excel.
        </div>
      ) : (
        visibleTypes.map(type => {
          const rows = grouped[type] ?? [];
          if (rows.length === 0) return null;
          const total = rows.reduce((s, l) => s + l.montant, 0);
          return (
            <div key={type} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
                <h2 className="font-semibold text-gray-800">{TYPE_LABELS[type]}</h2>
                <span className="text-sm font-semibold text-gray-700">{formatMontant(total)}</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr>
                    {['Code', 'Catégorie', 'Sous-catégorie', 'Montant', ''].map(h => (
                      <th key={h} className="table-head px-4 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="table-cell font-mono text-xs text-gray-500">{l.code_compte || '–'}</td>
                      <td className="table-cell font-medium">{l.categorie}</td>
                      <td className="table-cell text-gray-500">{l.sous_categorie || '–'}</td>
                      <td className="table-cell text-right font-semibold">{formatMontant(l.montant)}</td>
                      <td className="table-cell">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openEdit(l)} className="text-xs text-navy hover:underline">Modifier</button>
                          <button onClick={() => handleDelete(l.id)} className="text-xs text-red-500 hover:underline">Suppr.</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}

      {/* ── Modal Ajouter / Modifier ── */}
      <Modal title={editing ? 'Modifier la ligne' : 'Nouvelle ligne budgétaire'} open={modal} onClose={() => setModal(false)}>
        {err && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</p>}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Type de flux</label>
            <select className="input" value={form.type_flux} onChange={e => setForm(f => ({ ...f, type_flux: e.target.value }))}>
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Code compte</label>
              <input className="input" placeholder="60, 61…" maxLength={10}
                value={form.code_compte} onChange={e => setForm(f => ({ ...f, code_compte: e.target.value }))} />
            </div>
            <div>
              <label className="label">Montant (€)</label>
              <input type="number" min={0} step="0.01" className="input"
                value={form.montant} onChange={e => setForm(f => ({ ...f, montant: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div>
            <label className="label">Catégorie <span className="text-red-500">*</span></label>
            <input className="input" required maxLength={255}
              value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} />
          </div>
          <div>
            <label className="label">Sous-catégorie</label>
            <input className="input" maxLength={255}
              value={form.sous_categorie} onChange={e => setForm(f => ({ ...f, sous_categorie: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Import Excel ── */}
      <Modal title="Importer un fichier Excel" open={importModal} onClose={() => setImportModal(false)}>
        {/* Template download */}
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Téléchargez le modèle Excel</p>
            <p className="text-blue-600 text-xs mb-2">
              Le fichier doit contenir les colonnes : Type de flux, Code compte, Catégorie, Sous-catégorie, Montant.
            </p>
            <a
              href="/api/budgets-structure/template"
              download
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 underline hover:text-blue-900"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger le modèle (modele_budget_structure.xlsx)
            </a>
          </div>
        </div>

        {importErr && (
          <div className="mb-4 rounded bg-red-50 border border-red-200 p-3 text-sm text-red-600">
            {importErr}
          </div>
        )}

        {importResult && (
          <div className="mb-4 rounded bg-green-50 border border-green-200 p-3 text-sm">
            <p className="font-medium text-green-700">✓ {importResult.message}</p>
            {importResult.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-orange-600 font-medium text-xs">Avertissements ({importResult.errors.length}) :</p>
                <ul className="mt-1 space-y-0.5 text-xs text-orange-600 list-disc list-inside">
                  {importResult.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                  {importResult.errors.length > 10 && (
                    <li>…et {importResult.errors.length - 10} autre(s)</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleImport} className="space-y-4">
          {/* File input */}
          <div>
            <label className="label">Fichier Excel <span className="text-red-500">*</span></label>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="block w-full text-sm text-gray-500
                file:mr-3 file:py-2 file:px-4 file:rounded file:border-0
                file:text-sm file:font-medium file:bg-navy file:text-white
                hover:file:bg-navy-light cursor-pointer"
              onChange={e => setImportFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-gray-400">Formats acceptés : .xlsx, .xls, .csv</p>
          </div>

          {/* Year */}
          <div>
            <label className="label">Exercice</label>
            <select
              className="input"
              value={importAnnee}
              onChange={e => setImportAnnee(parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => annee - 1 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Mode */}
          <div>
            <label className="label">Mode d'import</label>
            <div className="space-y-2 mt-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="append"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="font-medium text-gray-800">Ajouter</span>
                  <span className="text-gray-500"> — ajoute les nouvelles lignes aux données existantes</span>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="font-medium text-gray-800">Remplacer</span>
                  <span className="text-gray-500"> — supprime toutes les lignes de l'exercice avant d'importer</span>
                </span>
              </label>
            </div>
            {importMode === 'replace' && (
              <div className="mt-2 flex items-start gap-2 rounded bg-orange-50 border border-orange-200 p-2 text-xs text-orange-700">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  <strong>Attention :</strong> toutes les lignes budgétaires de l'exercice {importAnnee} seront supprimées
                  et remplacées par le contenu du fichier. Cette action est irréversible.
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setImportModal(false)} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={importing || !importFile} className="btn-primary flex items-center gap-2">
              {importing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Import en cours…
                </>
              ) : (
                'Importer'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function BudgetStructurePage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400 text-sm">Chargement...</div>}>
      <BudgetStructureContent />
    </Suspense>
  );
}
