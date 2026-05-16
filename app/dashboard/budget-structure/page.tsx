'use client';
import { useState, useEffect, FormEvent } from 'react';
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

const empty = { type_flux: 'charge', code_compte: '', categorie: '', sous_categorie: '', montant: 0, ordre: 0 };

export default function BudgetStructurePage() {
  const annee = new Date().getFullYear();
  const [lignes, setLignes]   = useState<Ligne[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Ligne | null>(null);
  const [form, setForm]       = useState({ ...empty });
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const reload = () => {
    setLoading(true);
    fetch(`/api/budgets-structure?annee=${annee}`)
      .then(r => r.json())
      .then(data => { setLignes(data); setLoading(false); });
  };

  useEffect(reload, [annee]);

  function openAdd() {
    setEditing(null);
    setForm({ ...empty });
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

  const grouped = lignes.reduce<Record<string, Ligne[]>>((acc, l) => {
    (acc[l.type_flux] ??= []).push(l);
    return acc;
  }, {});

  const totalCharges  = (grouped.charge ?? []).reduce((s, l) => s + l.montant, 0);
  const totalProduits = (grouped.produit ?? []).reduce((s, l) => s + l.montant, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget de la Structure</h1>
          <p className="text-sm text-gray-500">Exercice {annee}</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Ajouter une ligne</button>
      </div>

      {/* Solde */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Charges',  val: totalCharges,               color: 'text-red-600' },
          { label: 'Total Produits', val: totalProduits,              color: 'text-green-600' },
          { label: 'Solde',          val: totalProduits - totalCharges, color: totalProduits - totalCharges >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-xs font-medium text-gray-500 uppercase">{s.label}</p>
            <p className={`mt-1 text-xl font-bold ${s.color}`}>{formatMontant(s.val)}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Chargement...</p>
      ) : lignes.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          Aucune ligne budgétaire. Cliquez sur &quot;Ajouter une ligne&quot; pour commencer.
        </div>
      ) : (
        Object.entries(TYPE_LABELS).map(([type, label]) => {
          const rows = grouped[type] ?? [];
          if (rows.length === 0) return null;
          const total = rows.reduce((s, l) => s + l.montant, 0);
          return (
            <div key={type} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
                <h2 className="font-semibold text-gray-800">{label}</h2>
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

      {/* Modal */}
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
    </div>
  );
}
