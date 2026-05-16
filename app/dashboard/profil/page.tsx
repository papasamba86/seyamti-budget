'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

const ROLE_LABELS: Record<string, string> = {
  admin:   'Administrateur',
  editeur: 'Consultation + Modification',
  lecteur: 'Consultation',
};

export default function ProfilPage() {
  const { data: session } = useSession();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (form.newPassword !== form.confirm) {
      setMsg({ type: 'err', text: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }
    if (form.newPassword.length < 8) {
      setMsg({ type: 'err', text: 'Le nouveau mot de passe doit faire au moins 8 caractères.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/profil/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: 'err', text: data.error ?? 'Erreur inconnue' });
      } else {
        setMsg({ type: 'ok', text: 'Mot de passe modifié avec succès.' });
        setForm({ currentPassword: '', newPassword: '', confirm: '' });
      }
    } finally {
      setLoading(false);
    }
  }

  const role = session?.user?.role ?? '';

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon profil</h1>

      {/* Info utilisateur */}
      <div className="card p-6 mb-6 space-y-3">
        <h2 className="font-semibold text-gray-700 mb-3">Informations</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500">Nom complet</p>
            <p className="font-medium text-gray-900">{session?.user?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium text-gray-900">{session?.user?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Habilitation</p>
            <p className="font-medium text-gray-900">{ROLE_LABELS[role] ?? role}</p>
          </div>
        </div>
      </div>

      {/* Changement de mot de passe */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Changer de mot de passe</h2>

        {msg && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            msg.type === 'ok'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe actuel
            </label>
            <input
              type="password"
              required
              value={form.currentPassword}
              onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
              className="input w-full"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={form.newPassword}
              onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
              className="input w-full"
              placeholder="Minimum 8 caractères"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              required
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              className="input w-full"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
