'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FONDS_CONFIG } from '@/lib/reglementation/fonds.config';

interface Fiche {
  id: number;
  titre: string;
  fonds_id: string;
  statut: string;
  type_structure: string;
  porteur_nom: string;
  cout_total: number;
  montant_subvention_demande: number;
  taux_subvention: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

const STATUT_LABELS: Record<string, { label: string; cls: string }> = {
  brouillon:  { label: 'Brouillon',   cls: 'bg-gray-100 text-gray-700' },
  en_cours:   { label: 'En cours',    cls: 'bg-blue-100 text-blue-700' },
  soumis:     { label: 'Soumis',      cls: 'bg-yellow-100 text-yellow-700' },
  valide:     { label: 'Validé',      cls: 'bg-green-100 text-green-700' },
  refuse:     { label: 'Refusé',      cls: 'bg-red-100 text-red-700' },
  archive:    { label: 'Archivé',     cls: 'bg-purple-100 text-purple-700' },
};

const NIVEAU_LABELS: Record<string, { label: string; cls: string }> = {
  europeen:     { label: 'Européen',     cls: 'bg-blue-50 text-blue-800 border border-blue-200' },
  national:     { label: 'National',     cls: 'bg-indigo-50 text-indigo-800 border border-indigo-200' },
  regional:     { label: 'Régional',     cls: 'bg-teal-50 text-teal-800 border border-teal-200' },
  departemental:{ label: 'Départemental',cls: 'bg-green-50 text-green-800 border border-green-200' },
  prive:        { label: 'Privé/Fond.',  cls: 'bg-orange-50 text-orange-800 border border-orange-200' },
};

function formatEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export default function FichesProjetPage() {
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [filterStatut, setFilterStatut] = useState('');
  const [filterFonds, setFilterFonds] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatut) params.set('statut', filterStatut);
      if (filterFonds) params.set('fonds', filterFonds);
      const res = await fetch(`/api/fiches-projet?${params}`);
      if (res.ok) setFiches(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterStatut, filterFonds]); // eslint-disable-line

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cette fiche projet ? Cette action est irréversible.')) return;
    setDeleting(id);
    try {
      await fetch(`/api/fiches-projet/${id}`, { method: 'DELETE' });
      setFiches(prev => prev.filter(f => f.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  const displayed = fiches.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.titre.toLowerCase().includes(q) ||
      f.porteur_nom.toLowerCase().includes(q) ||
      f.fonds_id.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: fiches.length,
    brouillon: fiches.filter(f => f.statut === 'brouillon').length,
    enCours: fiches.filter(f => f.statut === 'en_cours').length,
    soumis: fiches.filter(f => f.statut === 'soumis').length,
    totalSubvention: fiches.reduce((s, f) => s + Number(f.montant_subvention_demande ?? 0), 0),
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">FicheProjet Pro</h1>
          <p className="text-sm text-gray-500 mt-1">
            Dossiers de demande de subvention conformes à la réglementation exacte de chaque fonds
          </p>
        </div>
        <Link
          href="/dashboard/fiches-projet/nouveau"
          className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-lg font-semibold hover:bg-navy-light transition-colors"
        >
          + Nouvelle fiche
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, cls: 'text-navy' },
          { label: 'Brouillons', value: stats.brouillon, cls: 'text-gray-600' },
          { label: 'En cours', value: stats.enCours, cls: 'text-blue-600' },
          { label: 'Soumis', value: stats.soumis, cls: 'text-yellow-600' },
          { label: 'Subventions', value: formatEur(stats.totalSubvention), cls: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Rechercher (titre, porteur, fonds...)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
        />
        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filterFonds}
          onChange={e => setFilterFonds(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
        >
          <option value="">Tous les fonds</option>
          {Object.entries(FONDS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.nom}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors"
        >
          Actualiser
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Chargement...</div>
        ) : displayed.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg mb-2">Aucune fiche projet trouvée</p>
            <p className="text-gray-400 text-sm mb-4">
              {fiches.length === 0
                ? 'Créez votre première fiche pour commencer'
                : 'Aucun résultat pour ces filtres'}
            </p>
            {fiches.length === 0 && (
              <Link
                href="/dashboard/fiches-projet/nouveau"
                className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-navy-light transition-colors"
              >
                + Créer une fiche
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Titre</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Fonds</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Porteur</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Coût total</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Subvention</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Taux</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Statut</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(f => {
                  const config = FONDS_CONFIG[f.fonds_id];
                  const niveau = NIVEAU_LABELS[config?.niveau ?? ''];
                  const statut = STATUT_LABELS[f.statut] ?? { label: f.statut, cls: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/fiches-projet/${f.id}`}
                          className="font-medium text-navy hover:underline line-clamp-2 max-w-xs"
                        >
                          {f.titre}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">
                          #{f.id} · {new Date(f.updated_at).toLocaleDateString('fr-FR')}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium text-gray-700 line-clamp-2 max-w-[160px]">
                          {config?.nom ?? f.fonds_id}
                        </div>
                        {niveau && (
                          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${niveau.cls}`}>
                            {niveau.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700 line-clamp-1">{f.porteur_nom || '—'}</p>
                        <p className="text-xs text-gray-400">{f.created_by_name}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700">
                        {formatEur(Number(f.cout_total ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
                        {formatEur(Number(f.montant_subvention_demande ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-navy">{Number(f.taux_subvention ?? 0).toFixed(0)}%</span>
                        {config && (
                          <p className="text-xs text-gray-400">max {config.tauxMax}%</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statut.cls}`}>
                          {statut.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/fiches-projet/${f.id}`}
                            className="p-1.5 rounded-lg hover:bg-navy/10 text-navy transition-colors"
                            title="Voir / Modifier"
                          >
                            ✏️
                          </Link>
                          <Link
                            href={`/dashboard/fiches-projet/${f.id}/print`}
                            target="_blank"
                            className="p-1.5 rounded-lg hover:bg-gold/10 text-gold-dark transition-colors"
                            title="Générer le dossier PDF"
                          >
                            📄
                          </Link>
                          <button
                            onClick={() => handleDelete(f.id)}
                            disabled={deleting === f.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="mt-4 text-xs text-gray-400 text-center">
        {displayed.length} fiche(s) affichée(s) · Base réglementaire : Fonds EU 2021-2027 + Fonds nationaux français
      </div>
    </div>
  );
}
