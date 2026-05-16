'use client';
import { useState, useEffect, FormEvent } from 'react';
import Modal from '@/components/Modal';
import { formatMontant } from '@/lib/utils';

interface Emploi {
  id: number; cotation: number; indice_professionnel: number;
  libelle: string; salaire_annuel: number;
}

const emptyForm = { cotation: 1, indice_professionnel: 300, libelle: '', salaire_annuel: 0 };

export default function EmploisPage() {
  const [emplois, setEmplois]   = useState<Emploi[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState<Emploi | null>(null);
  const [form, setForm]         = useState({ ...emptyForm });
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');

  const reload = () => {
    setLoading(true);
    fetch('/api/emplois').then(r => r.json()).then(d => { setEmplois(d); setLoading(false); });
  };

  useEffect(reload, []);

  function openAdd() {
    setEditing(null); setForm({ ...emptyForm }); setErr(''); setModal(true);
  }
  function openEdit(e: Emploi) {
    setEditing(e);
    setForm({ cotation: e.cotation, indice_professionnel: e.indice_professionnel, libelle: e.libelle, salaire_annuel: e.salaire_annuel });
    setErr(''); setModal(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setSaving(true); setErr('');
    const payload = editing ? { id: editing.id, ...form } : form;
    const res = await fetch('/api/emplois', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, salaire_annuel: parseFloat(String(payload.salaire_annuel)) }),
    });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setErr(data.error ?? 'Erreur'); return; }
    setModal(false); reload();
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cet emploi repère ?')) return;
    await fetch(`/api/emplois?id=${id}`, { method: 'DELETE' }); reload();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emplois Repères</h1>
          <p className="text-sm text-gray-500">Grille de classification et salaires annuels</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Ajouter un emploi</button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Chargement...</p>
      ) : emplois.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium">Aucun emploi repère</p>
          <p className="text-sm mt-1">Ajoutez les emplois de la grille de classification.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                {['Cotation', 'Indice', 'Libellé du poste', 'Salaire annuel brut', 'Actions'].map(h => (
                  <th key={h} className="table-head px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {emplois.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="table-cell text-center font-bold text-navy">{e.cotation}</td>
                  <td className="table-cell text-center font-mono">{e.indice_professionnel}</td>
                  <td className="table-cell font-medium">{e.libelle}</td>
                  <td className="table-cell text-right font-semibold text-green-700">{formatMontant(e.salaire_annuel)}</td>
                  <td className="table-cell">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(e)} className="text-xs text-navy hover:underline">Modifier</button>
                      <button onClick={() => handleDelete(e.id)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title={editing ? 'Modifier l\'emploi' : 'Nouvel emploi repère'} open={modal} onClose={() => setModal(false)}>
        {err && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</p>}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cotation</label>
              <input type="number" min={1} className="input"
                value={form.cotation} onChange={e => setForm(f => ({ ...f, cotation: parseInt(e.target.value) || 1 }))} />
            </div>
            <div>
              <label className="label">Indice professionnel</label>
              <input type="number" min={1} className="input"
                value={form.indice_professionnel}
                onChange={e => setForm(f => ({ ...f, indice_professionnel: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>
          <div>
            <label className="label">Libellé du poste <span className="text-red-500">*</span></label>
            <input className="input" required maxLength={255}
              value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} />
          </div>
          <div>
            <label className="label">Salaire annuel brut (€)</label>
            <input type="number" min={0} step="0.01" className="input"
              value={form.salaire_annuel}
              onChange={e => setForm(f => ({ ...f, salaire_annuel: parseFloat(e.target.value) || 0 }))} />
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
