'use client';
import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { formatMontant } from '@/lib/utils';
import Modal from '@/components/Modal';

interface Action { id: number; nom: string; annee: number; statut: string }
interface BudgetLigne {
  id: number; type_flux: string; code_compte: string;
  categorie: string; sous_categorie: string; montant: number;
}

const TYPE_OPTIONS = [
  { value: 'charge',                 label: 'Charge',                  side: 'charges'  },
  { value: 'contribution_emploi',    label: 'Contribution – Emploi',   side: 'charges'  },
  { value: 'produit',                label: 'Produit',                 side: 'produits' },
  { value: 'contribution_ressource', label: 'Contribution – Ressource',side: 'produits' },
];

/* ── Inline input ── */
function CellInput({ defaultValue, onSave, onCancel, type = 'text', align = 'left' }: {
  defaultValue: string; onSave: (v: string) => void; onCancel: () => void;
  type?: string; align?: 'left' | 'right';
}) {
  const [val, setVal] = useState(defaultValue);
  const done = useRef(false);
  function commit(v: string) { if (done.current) return; done.current = true; onSave(v); }
  return (
    <input type={type} value={val} autoFocus
      min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined}
      onChange={e => setVal(e.target.value)}
      onBlur={() => commit(val)}
      onKeyDown={e => { if (e.key === 'Enter') commit(val); if (e.key === 'Escape') { done.current = true; onCancel(); } }}
      className={`w-full rounded border border-navy px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-navy ${align === 'right' ? 'text-right' : ''}`}
    />
  );
}

export default function BudgetActionPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lignes, setLignes] = useState<BudgetLigne[]>([]);
  const [editCell, setEditCell] = useState<{ id: number; field: string } | null>(null);

  /* modals */
  const [modalSide, setModalSide] = useState<'charges' | 'produits' | null>(null);
  const [formLigne, setFormLigne] = useState({ type_flux: 'charge', code_compte: '', categorie: '', sous_categorie: '', montant: 0 });
  const [saving, setSaving] = useState(false);
  const [modalErr, setModalErr] = useState('');

  useEffect(() => {
    fetch('/api/actions').then(r => r.json()).then((data: Action[]) => {
      setActions(data);
      if (data.length > 0) setSelectedId(data[0].id);
    });
  }, []);

  const loadLignes = useCallback(() => {
    if (!selectedId) return;
    fetch(`/api/budget-previsionnel?action_id=${selectedId}`).then(r => r.json()).then(setLignes);
  }, [selectedId]);

  useEffect(() => { loadLignes(); }, [loadLignes]);

  /* ── Update a field inline ── */
  async function updateLigne(l: BudgetLigne, field: string, rawValue: string) {
    const u = { ...l };
    if (field === 'type_flux')      u.type_flux      = rawValue;
    if (field === 'code_compte')    u.code_compte    = rawValue;
    if (field === 'categorie')      u.categorie      = rawValue;
    if (field === 'sous_categorie') u.sous_categorie = rawValue;
    if (field === 'montant')        u.montant        = Math.max(0, parseFloat(rawValue) || 0);

    await fetch('/api/budget-previsionnel', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, action_id: selectedId, type_flux: u.type_flux, code_compte: u.code_compte, categorie: u.categorie, sous_categorie: u.sous_categorie, montant: u.montant, ordre: 0 }),
    });
    loadLignes();
  }

  /* ── Add ── */
  async function addLigne(e: FormEvent) {
    e.preventDefault(); setSaving(true); setModalErr('');
    const res = await fetch('/api/budget-previsionnel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_id: selectedId, ...formLigne }),
    });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setModalErr(data.error ?? 'Erreur'); return; }
    setModalSide(null);
    setFormLigne({ type_flux: 'charge', code_compte: '', categorie: '', sous_categorie: '', montant: 0 });
    loadLignes();
  }

  /* ── Delete ── */
  async function deleteLigne(id: number) {
    if (!confirm('Supprimer cette ligne ?')) return;
    await fetch(`/api/budget-previsionnel?id=${id}`, { method: 'DELETE' });
    loadLignes();
  }

  /* ── Cell renderers ── */
  function textCell(rowId: number, field: string, value: string, onSave: (v: string) => void) {
    if (editCell?.id === rowId && editCell.field === field) {
      return <CellInput defaultValue={value} onSave={v => { setEditCell(null); onSave(v); }} onCancel={() => setEditCell(null)} />;
    }
    return (
      <span onClick={() => setEditCell({ id: rowId, field })}
        className="block cursor-text rounded px-1.5 py-0.5 text-sm hover:bg-blue-50 min-h-[1.75rem] transition-colors" title="Cliquer pour modifier">
        {value || <span className="text-gray-300 italic">—</span>}
      </span>
    );
  }

  function numCell(rowId: number, field: string, raw: number, onSave: (v: string) => void) {
    if (editCell?.id === rowId && editCell.field === field) {
      return <CellInput defaultValue={String(raw)} type="number" align="right" onSave={v => { setEditCell(null); onSave(v); }} onCancel={() => setEditCell(null)} />;
    }
    return (
      <span onClick={() => setEditCell({ id: rowId, field })}
        className="block cursor-text rounded px-1.5 py-0.5 text-sm text-right hover:bg-blue-50 min-h-[1.75rem] transition-colors font-semibold" title="Cliquer pour modifier">
        {formatMontant(raw)}
      </span>
    );
  }

  function typeCell(rowId: number, value: string, onSave: (v: string) => void, sideOptions: typeof TYPE_OPTIONS) {
    if (editCell?.id === rowId && editCell.field === 'type_flux') {
      return (
        <select autoFocus value={value}
          onChange={async e => { setEditCell(null); onSave(e.target.value); }}
          onBlur={() => setEditCell(null)}
          className="w-full rounded border border-navy px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy">
          {sideOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    const opt = TYPE_OPTIONS.find(o => o.value === value);
    return (
      <span onClick={() => setEditCell({ id: rowId, field: 'type_flux' })}
        className="block cursor-text rounded px-1.5 py-0.5 text-xs hover:bg-blue-50 min-h-[1.75rem] transition-colors text-gray-500" title="Cliquer pour modifier">
        {opt?.label ?? value}
      </span>
    );
  }

  /* ── Data splits ── */
  const charges  = lignes.filter(l => l.type_flux === 'charge' || l.type_flux === 'contribution_emploi');
  const produits = lignes.filter(l => l.type_flux === 'produit' || l.type_flux === 'contribution_ressource');
  const totalCharges  = charges.reduce((s, l) => s + Number(l.montant), 0);
  const totalProduits = produits.reduce((s, l) => s + Number(l.montant), 0);
  const solde = totalProduits - totalCharges;

  const selectedAction = actions.find(a => a.id === selectedId);

  const chargeTypeOpts  = TYPE_OPTIONS.filter(o => o.side === 'charges');
  const produitTypeOpts = TYPE_OPTIONS.filter(o => o.side === 'produits');

  /* ── Table for one side ── */
  function BudgetTable({ items, typeOpts }: { items: BudgetLigne[]; typeOpts: typeof TYPE_OPTIONS }) {
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-28">Type</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-16">Code</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Catégorie</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Sous-catégorie</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-36">Montant</th>
            <th className="px-3 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(l => (
            <tr key={l.id} className="hover:bg-gray-50">
              <td className="px-3 py-1">{typeCell(l.id, l.type_flux, v => updateLigne(l, 'type_flux', v), typeOpts)}</td>
              <td className="px-3 py-1">{textCell(l.id, 'code_compte', l.code_compte, v => updateLigne(l, 'code_compte', v))}</td>
              <td className="px-3 py-1">{textCell(l.id, 'categorie', l.categorie, v => updateLigne(l, 'categorie', v))}</td>
              <td className="px-3 py-1">{textCell(l.id, 'sous_categorie', l.sous_categorie, v => updateLigne(l, 'sous_categorie', v))}</td>
              <td className="px-3 py-1">{numCell(l.id, 'montant', l.montant, v => updateLigne(l, 'montant', v))}</td>
              <td className="px-3 py-1 text-center">
                <button onClick={() => deleteLigne(l.id)} className="text-gray-300 hover:text-red-500 text-base leading-none" title="Supprimer">✕</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-4 text-center text-xs text-gray-400 italic">Aucune ligne</td></tr>
          )}
        </tbody>
      </table>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget action</h1>
          <p className="text-sm text-gray-500 mt-0.5">Budget prévisionnel par action – CHARGES et PRODUITS</p>
        </div>

        {/* Action selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Action :</label>
          <select
            value={selectedId ?? ''}
            onChange={e => setSelectedId(parseInt(e.target.value))}
            className="input w-72"
          >
            {actions.map(a => <option key={a.id} value={a.id}>{a.nom} ({a.annee})</option>)}
          </select>
        </div>
      </div>

      {!selectedId ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-3xl mb-2">📊</p>
          <p>Sélectionnez une action pour afficher son budget.</p>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total charges</p>
              <p className="mt-1 text-lg font-bold text-red-600">{formatMontant(totalCharges)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total produits</p>
              <p className="mt-1 text-lg font-bold text-green-600">{formatMontant(totalProduits)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Solde</p>
              <p className={`mt-1 text-lg font-bold ${solde >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatMontant(Math.abs(solde))} {solde >= 0 ? '(excédent)' : '(déficit)'}
              </p>
            </div>
          </div>

          {/* Two-column budget layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* CHARGES */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b-2 border-red-400 pb-2">
                <h2 className="text-base font-bold text-red-700 uppercase tracking-wide">Charges</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-red-600">{formatMontant(totalCharges)}</span>
                  <button
                    onClick={() => { setFormLigne({ type_flux: 'charge', code_compte: '', categorie: '', sous_categorie: '', montant: 0 }); setModalErr(''); setModalSide('charges'); }}
                    className="btn-primary py-1 text-xs">+ Ajouter
                  </button>
                </div>
              </div>
              <div className="card overflow-x-auto">
                <BudgetTable items={charges} typeOpts={chargeTypeOpts} />
                {charges.length > 0 && (
                  <div className="border-t-2 border-red-200 bg-red-50 px-3 py-2 text-right text-sm font-bold text-red-700">
                    TOTAL CHARGES : {formatMontant(totalCharges)}
                  </div>
                )}
              </div>
            </div>

            {/* PRODUITS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b-2 border-green-500 pb-2">
                <h2 className="text-base font-bold text-green-700 uppercase tracking-wide">Produits</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-green-600">{formatMontant(totalProduits)}</span>
                  <button
                    onClick={() => { setFormLigne({ type_flux: 'produit', code_compte: '', categorie: '', sous_categorie: '', montant: 0 }); setModalErr(''); setModalSide('produits'); }}
                    className="btn-primary py-1 text-xs">+ Ajouter
                  </button>
                </div>
              </div>
              <div className="card overflow-x-auto">
                <BudgetTable items={produits} typeOpts={produitTypeOpts} />
                {produits.length > 0 && (
                  <div className="border-t-2 border-green-200 bg-green-50 px-3 py-2 text-right text-sm font-bold text-green-700">
                    TOTAL PRODUITS : {formatMontant(totalProduits)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Solde ligne */}
          {(charges.length > 0 || produits.length > 0) && (
            <div className={`card p-4 flex items-center justify-between ${solde >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <span className="font-semibold text-gray-700">
                {solde >= 0 ? '✅ Excédent' : '⚠️ Déficit'}
              </span>
              <span className={`text-xl font-bold ${solde >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatMontant(Math.abs(solde))}
              </span>
            </div>
          )}
        </>
      )}

      {/* Modal ajouter ligne */}
      <Modal title={`Nouvelle ligne – ${modalSide === 'charges' ? 'Charges' : 'Produits'}`} open={modalSide !== null} onClose={() => setModalSide(null)}>
        {modalErr && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{modalErr}</p>}
        <form onSubmit={addLigne} className="space-y-4">
          <div>
            <label className="label">Type de flux</label>
            <select className="input" value={formLigne.type_flux}
              onChange={e => setFormLigne(f => ({ ...f, type_flux: e.target.value }))}>
              {(modalSide === 'charges' ? chargeTypeOpts : produitTypeOpts).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Code compte</label>
              <input className="input" maxLength={10} placeholder="60, 70…"
                value={formLigne.code_compte} onChange={e => setFormLigne(f => ({ ...f, code_compte: e.target.value }))} />
            </div>
            <div>
              <label className="label">Montant (€)</label>
              <input type="number" min={0} step="0.01" className="input"
                value={formLigne.montant} onChange={e => setFormLigne(f => ({ ...f, montant: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div>
            <label className="label">Catégorie <span className="text-red-500">*</span></label>
            <input className="input" required maxLength={255}
              value={formLigne.categorie} onChange={e => setFormLigne(f => ({ ...f, categorie: e.target.value }))} />
          </div>
          <div>
            <label className="label">Sous-catégorie</label>
            <input className="input" maxLength={255}
              value={formLigne.sous_categorie} onChange={e => setFormLigne(f => ({ ...f, sous_categorie: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalSide(null)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Ajout...' : 'Ajouter'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
