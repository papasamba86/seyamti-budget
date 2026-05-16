'use client';
import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';

interface Action {
  id: number; nom: string; description: string;
  annee: number; statut: string; created_at: string;
}

const STATUTS = [
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine',  label: 'Terminé'  },
  { value: 'suspendu', label: 'Suspendu' },
];
const BADGE: Record<string, string> = {
  en_cours: 'badge-green', termine: 'badge-gray', suspendu: 'badge-yellow',
};
const emptyForm = { nom: '', description: '', annee: new Date().getFullYear(), statut: 'en_cours' };

export default function ActionsPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Action | null>(null);
  const [form, setForm]       = useState({ ...emptyForm });
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const reload = () => {
    setLoading(true);
    fetch('/api/actions').then(r => r.json()).then(d => { setActions(d); setLoading(false); });
  };

  useEffect(reload, []);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm });
    setErr('');
    setModal(true);
  }

  function openEdit(a: Action) {
    setEditing(a);
    setForm({ nom: a.nom, description: a.description ?? '', annee: a.annee, statut: a.statut });
    setErr('');
    setModal(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setErr('');

    const url = editing ? `/api/actions/${editing.id}` : '/api/actions';
    const res = await fetch(url, {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error ?? 'Erreur'); return; }
    setModal(false);
    reload();
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cette action et toutes ses données ?')) return;
    await fetch(`/api/actions/${id}`, { method: 'DELETE' });
    reload();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Actions / Projets</h1>
        <button onClick={openAdd} className="btn-primary">+ Nouvelle action</button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Chargement...</p>
      ) : actions.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">Aucune action créée</p>
          <p className="text-sm mt-1">Créez votre première action pour commencer.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                {['Nom de l\'action', 'Année', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="table-head px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {actions.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <Link href={`/dashboard/actions/${a.id}`} className="font-medium text-navy hover:underline">
                      {a.nom}
                    </Link>
                    {a.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{a.description}</p>}
                  </td>
                  <td className="table-cell">{a.annee}</td>
                  <td className="table-cell">
                    <span className={BADGE[a.statut] ?? 'badge-gray'}>
                      {STATUTS.find(s => s.value === a.statut)?.label ?? a.statut}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-3">
                      <Link href={`/dashboard/actions/${a.id}`} className="text-xs text-navy hover:underline">Ouvrir</Link>
                      <button onClick={() => openEdit(a)} className="text-xs text-gray-500 hover:underline">Modifier</button>
                      <button onClick={() => handleDelete(a.id)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title={editing ? 'Modifier l\'action' : 'Nouvelle action'} open={modal} onClose={() => setModal(false)}>
        {err && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</p>}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nom de l&apos;action <span className="text-red-500">*</span></label>
            <input className="input" required maxLength={255}
              value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input h-24 resize-none" maxLength={2000}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Année</label>
              <input type="number" className="input" min={2000} max={2100}
                value={form.annee} onChange={e => setForm(f => ({ ...f, annee: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Statut</label>
              <select className="input" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
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
