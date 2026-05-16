'use client';
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', confirm: '', nom: '', prenom: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/setup')
      .then(r => r.json())
      .then(data => {
        if (data.hasUsers) router.replace('/login');
        else setChecking(false);
      });
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:    form.email.trim().toLowerCase(),
        password: form.password,
        nom:      form.nom.trim(),
        prenom:   form.prenom.trim(),
        role:     'admin',
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) setError(data.error ?? 'Erreur lors de la création');
    else router.push('/login?setup=ok');
  }

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy">
        <p className="text-white">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy to-navy-dark p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gold text-navy text-3xl font-black">
            S
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">SeyAmTi Conseil</h1>
          <p className="mt-1 text-sm text-blue-200">Configuration initiale</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Créer le compte administrateur</h2>
          <p className="mb-6 text-sm text-gray-500">Cette page n&apos;est accessible qu&apos;une seule fois.</p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prénom</label>
                <input className="input" value={form.prenom} onChange={e => update('prenom', e.target.value)} required maxLength={100} />
              </div>
              <div>
                <label className="label">Nom</label>
                <input className="input" value={form.nom} onChange={e => update('nom', e.target.value)} required maxLength={100} />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={e => update('email', e.target.value)} required maxLength={255} />
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <input type="password" className="input" value={form.password} onChange={e => update('password', e.target.value)} required minLength={8} maxLength={100} />
            </div>

            <div>
              <label className="label">Confirmer le mot de passe</label>
              <input type="password" className="input" value={form.confirm} onChange={e => update('confirm', e.target.value)} required maxLength={100} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? 'Création...' : 'Créer le compte administrateur'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-500">
            <Link href="/login" className="text-navy hover:underline">← Retour à la connexion</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
