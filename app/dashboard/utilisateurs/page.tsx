'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin:   'Administrateur',
  editeur: 'Consultation + Modification',
  lecteur: 'Consultation',
};
const ROLE_BADGE: Record<string, string> = {
  admin:   'badge-blue',
  editeur: 'badge-green',
  lecteur: 'badge-gray',
};

type ModalMode = 'create' | 'edit' | 'password' | null;

const emptyForm = { email: '', prenom: '', nom: '', password: '', role: 'lecteur', newPassword: '' };

export default function UtilisateursPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/utilisateurs');
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchUsers();
  }, [session, status, router, fetchUsers]);

  function openCreate() {
    setForm(emptyForm);
    setFormError('');
    setSelected(null);
    setModal('create');
  }

  function openEdit(u: User) {
    setForm({ ...emptyForm, email: u.email, prenom: u.prenom, nom: u.nom, role: u.role });
    setFormError('');
    setSelected(u);
    setModal('edit');
  }

  function openPassword(u: User) {
    setForm({ ...emptyForm, newPassword: '' });
    setFormError('');
    setSelected(u);
    setModal('password');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const res = await fetch('/api/utilisateurs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, prenom: form.prenom, nom: form.nom, password: form.password, role: form.role }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(data.error ?? 'Erreur'); return; }
    setModal(null);
    fetchUsers();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setFormError('');
    const res = await fetch(`/api/utilisateurs/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, prenom: form.prenom, nom: form.nom, role: form.role }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(data.error ?? 'Erreur'); return; }
    setModal(null);
    fetchUsers();
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (form.newPassword.length < 8) { setFormError('Minimum 8 caractères'); return; }
    setSaving(true);
    setFormError('');
    const res = await fetch(`/api/utilisateurs/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: form.newPassword }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(data.error ?? 'Erreur'); return; }
    setModal(null);
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/utilisateurs/${id}`, { method: 'DELETE' });
    if (res.ok) { setDeleteId(null); fetchUsers(); }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <p className="text-sm text-gray-500">{users.length} utilisateur{users.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ Ajouter un utilisateur</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              {['Utilisateur', 'Email', 'Habilitation', 'Créé le', 'Actions'].map(h => (
                <th key={h} className="table-head px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="table-cell px-4 py-3 font-medium text-gray-900">
                  {u.prenom} {u.nom}
                </td>
                <td className="table-cell px-4 py-3 text-gray-600">{u.email}</td>
                <td className="table-cell px-4 py-3">
                  <span className={ROLE_BADGE[u.role] ?? 'badge-gray'}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td className="table-cell px-4 py-3 text-gray-500 text-sm">
                  {new Date(u.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="table-cell px-4 py-3">
                  {u.role !== 'admin' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-xs text-navy hover:underline font-medium"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => openPassword(u)}
                        className="text-xs text-amber-600 hover:underline font-medium"
                      >
                        Réinitialiser MDP
                      </button>
                      <button
                        onClick={() => setDeleteId(u.id)}
                        className="text-xs text-red-600 hover:underline font-medium"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                  {u.role === 'admin' && (
                    <span className="text-xs text-gray-400 italic">Admin principal</span>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Créer */}
      {modal === 'create' && (
        <Modal title="Ajouter un utilisateur" onClose={() => setModal(null)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{formError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prénom</label>
                <input className="input w-full" required value={form.prenom}
                  onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
              </div>
              <div>
                <label className="label">Nom</label>
                <input className="input w-full" required value={form.nom}
                  onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input w-full" type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Mot de passe provisoire</label>
              <input className="input w-full" type="password" required minLength={8} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Minimum 8 caractères" />
            </div>
            <div>
              <label className="label">Habilitation</label>
              <select className="input w-full" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="lecteur">Consultation (lecture seule)</option>
                <option value="editeur">Consultation + Modification</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Modifier */}
      {modal === 'edit' && selected && (
        <Modal title={`Modifier ${selected.prenom} ${selected.nom}`} onClose={() => setModal(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            {formError && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{formError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prénom</label>
                <input className="input w-full" required value={form.prenom}
                  onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
              </div>
              <div>
                <label className="label">Nom</label>
                <input className="input w-full" required value={form.nom}
                  onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input w-full" type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Habilitation</label>
              <select className="input w-full" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="lecteur">Consultation (lecture seule)</option>
                <option value="editeur">Consultation + Modification</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Réinitialiser MDP */}
      {modal === 'password' && selected && (
        <Modal title={`Réinitialiser le mot de passe de ${selected.prenom} ${selected.nom}`} onClose={() => setModal(null)}>
          <form onSubmit={handlePassword} className="space-y-4">
            {formError && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{formError}</p>}
            <p className="text-sm text-gray-600">
              Définissez un nouveau mot de passe provisoire pour cet utilisateur.
            </p>
            <div>
              <label className="label">Nouveau mot de passe</label>
              <input className="input w-full" type="password" required minLength={8} value={form.newPassword}
                onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="Minimum 8 caractères" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Modification...' : 'Réinitialiser'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmation suppression */}
      {deleteId !== null && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-600 mb-6">
            Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteId(null)} className="btn-secondary">Annuler</button>
            <button
              onClick={() => handleDelete(deleteId)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Supprimer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
