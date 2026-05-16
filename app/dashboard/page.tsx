'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatMontant } from '@/lib/utils';
import StatCard from '@/components/StatCard';

interface DashData {
  annee: number;
  actions: { total: number; en_cours: number; termine: number; suspendu: number };
  structure: { charges: number; produits: number };
  actionsRecentes: { id: number; nom: string; statut: string; total_charges: number; total_produits: number }[];
}

const STATUT_LABELS: Record<string, string> = {
  en_cours:  'En cours',
  termine:   'Terminé',
  suspendu:  'Suspendu',
};
const STATUT_BADGE: Record<string, string> = {
  en_cours:  'badge-green',
  termine:   'badge-gray',
  suspendu:  'badge-yellow',
};

export default function DashboardPage() {
  const annee = new Date().getFullYear();
  const [data, setData] = useState<DashData | null>(null);

  useEffect(() => {
    fetch(`/api/dashboard?annee=${annee}`)
      .then(r => r.json())
      .then(setData);
  }, [annee]);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  const balance = data.structure.produits - data.structure.charges;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-500">Exercice {annee}</p>
        </div>
        <Link href="/dashboard/actions" className="btn-primary">
          + Nouvelle action
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Actions actives"
          value={String(data.actions.en_cours)}
          sub={`${data.actions.total} au total`}
          color="blue"
          icon="📋"
        />
        <StatCard
          label="Charges structure"
          value={formatMontant(data.structure.charges)}
          color="red"
          icon="📤"
        />
        <StatCard
          label="Produits structure"
          value={formatMontant(data.structure.produits)}
          color="green"
          icon="📥"
        />
        <StatCard
          label="Solde structure"
          value={formatMontant(Math.abs(balance))}
          sub={balance >= 0 ? 'Excédent' : 'Déficit'}
          color={balance >= 0 ? 'green' : 'red'}
          icon={balance >= 0 ? '✅' : '⚠️'}
        />
      </div>

      {/* Recent Actions */}
      <div className="card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">Actions récentes</h2>
          <Link href="/dashboard/actions" className="text-sm text-navy hover:underline">
            Voir tout →
          </Link>
        </div>
        {data.actionsRecentes.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            Aucune action pour {annee}.{' '}
            <Link href="/dashboard/actions" className="text-navy hover:underline">Créer une action</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {['Action', 'Statut', 'Charges prévis.', 'Produits prévis.', 'Solde'].map(h => (
                  <th key={h} className="table-head px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.actionsRecentes.map(a => {
                const s = a.total_produits - a.total_charges;
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <Link href={`/dashboard/actions/${a.id}`} className="font-medium text-navy hover:underline">
                        {a.nom}
                      </Link>
                    </td>
                    <td className="table-cell">
                      <span className={STATUT_BADGE[a.statut] ?? 'badge-gray'}>
                        {STATUT_LABELS[a.statut] ?? a.statut}
                      </span>
                    </td>
                    <td className="table-cell text-right">{formatMontant(a.total_charges)}</td>
                    <td className="table-cell text-right">{formatMontant(a.total_produits)}</td>
                    <td className={`table-cell text-right font-medium ${s >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatMontant(s)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { href: '/dashboard/budget-structure', label: 'Budget Structure', desc: 'Charges & produits', icon: '🏛️' },
          { href: '/dashboard/actions',          label: 'Toutes les actions', desc: 'Gérer les projets', icon: '📋' },
          { href: '/dashboard/emplois',          label: 'Emplois repères', desc: 'Grille salariale', icon: '👥' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="card p-5 hover:border-navy hover:shadow-md transition-all group">
            <span className="text-2xl">{item.icon}</span>
            <p className="mt-2 font-semibold text-gray-900 group-hover:text-navy">{item.label}</p>
            <p className="text-xs text-gray-500">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
