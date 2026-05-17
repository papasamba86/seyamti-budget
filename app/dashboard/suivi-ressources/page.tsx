'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatMontant } from '@/lib/utils';

interface ActionDetail {
  action_id: number;
  action_nom: string;
  annee: number;
  statut: string;
  montant_affecte: number;
  date_debut: string | null;
  date_fin: string | null;
  total_charges: number;
}

interface RessourceSuivi {
  financeur: string;
  type_financement: string;
  date_debut: string | null;
  date_fin: string | null;
  montant_global: number;
  actions_detail: ActionDetail[];
}

interface SuiviData {
  ressources: RessourceSuivi[];
  totalAlloue: number;
  totalConsomme: number;
}

const STATUT_LABELS: Record<string, string> = {
  en_cours: 'En cours', termine: 'Terminé', suspendu: 'Suspendu',
};

function formatDate(d: string | null): string {
  if (!d) return '–';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return '–'; }
}

function getStatut(montantGlobal: number, totalConsomme: number): {
  icon: string; label: string; rowClass: string; barColor: string;
} {
  if (montantGlobal <= 0) return { icon: '⚪', label: 'Sans montant', rowClass: '', barColor: 'bg-gray-300' };
  const pct = totalConsomme / montantGlobal;
  if (pct >= 1)   return { icon: '🔴', label: 'Épuisé',    rowClass: 'bg-red-50 border-l-4 border-red-500',    barColor: 'bg-red-500' };
  if (pct >= 0.9) return { icon: '🔴', label: 'ALERTE',    rowClass: 'bg-red-50 border-l-4 border-red-500',    barColor: 'bg-red-400' };
  if (pct >= 0.75) return { icon: '🟡', label: 'ATTENTION', rowClass: 'bg-yellow-50 border-l-4 border-yellow-400', barColor: 'bg-yellow-400' };
  return { icon: '🟢', label: 'OK', rowClass: '', barColor: 'bg-green-500' };
}

export default function SuiviRessourcesPage() {
  const [data, setData] = useState<SuiviData>({ ressources: [], totalAlloue: 0, totalConsomme: 0 });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/suivi-ressources')
      .then(r => r.json())
      .then(res => {
        const d = res.data ?? res;
        setData({
          ressources:    (d.ressources ?? []).map((r: RessourceSuivi) => ({
            ...r,
            montant_global: Number(r.montant_global),
            actions_detail: (r.actions_detail ?? []).map((a: ActionDetail) => ({
              ...a,
              montant_affecte: Number(a.montant_affecte),
              total_charges:   Number(a.total_charges),
            })),
          })),
          totalAlloue:   Number(d.totalAlloue   ?? 0),
          totalConsomme: Number(d.totalConsomme ?? 0),
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function toggleExpand(key: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const { ressources, totalAlloue, totalConsomme } = data;
  const totalRestant = totalAlloue - totalConsomme;

  const alertCount = ressources.filter(r => {
    const consomme = r.actions_detail.reduce((s, a) => s + a.total_charges, 0);
    return r.montant_global > 0 && consomme / r.montant_global >= 0.9;
  }).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suivi Affectation des Ressources</h1>
        <p className="text-sm text-gray-500">
          Suivi par ressource (financeur) — consommation à travers toutes les actions
        </p>
      </div>

      {/* Alert */}
      {alertCount > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
          ⚠️ {alertCount} ressource{alertCount > 1 ? 's ont' : ' a'} atteint 90% ou plus de consommation
        </div>
      )}

      {/* Cards résumé */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Ressources suivies',  val: String(ressources.length),   color: 'text-navy' },
          { label: 'Montant global',       val: formatMontant(totalAlloue),  color: 'text-blue-700' },
          { label: 'Total consommé',       val: formatMontant(totalConsomme),color: 'text-gray-800' },
          {
            label: 'Total restant',
            val: formatMontant(totalRestant),
            color: totalRestant >= 0 ? 'text-green-600' : 'text-red-600',
          },
        ].map(c => (
          <div key={c.label} className="card p-4 text-center">
            <p className="text-xs font-medium text-gray-500 uppercase leading-tight">{c.label}</p>
            <p className={`mt-1 text-lg font-bold ${c.color}`}>{c.val}</p>
          </div>
        ))}
      </div>

      {/* Tableau */}
      {loading ? (
        <p className="text-gray-400 text-sm">Chargement…</p>
      ) : ressources.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          Aucune ressource trouvée. Ajoutez des financeurs dans vos&nbsp;
          <Link href="/dashboard/actions" className="text-navy underline">Actions</Link>.
        </div>
      ) : (
        <div className="space-y-4">
          {ressources.map(r => {
            const key = `${r.financeur}||${r.type_financement}`;
            const consomme = r.actions_detail.reduce((s, a) => s + a.total_charges, 0);
            const restant  = r.montant_global - consomme;
            const pctNum   = r.montant_global > 0 ? (consomme / r.montant_global) * 100 : 0;
            const statut   = getStatut(r.montant_global, consomme);
            const isOpen   = expanded.has(key);

            return (
              <div key={key} className={`card overflow-hidden ${statut.rowClass}`}>
                {/* ── En-tête de la ressource ── */}
                <button
                  onClick={() => toggleExpand(key)}
                  className="w-full text-left px-5 py-4 hover:bg-black/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Infos principales */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-gray-900 truncate">{r.financeur}</span>
                        {r.type_financement && (
                          <span className="text-xs rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 font-medium">
                            {r.type_financement}
                          </span>
                        )}
                        <span className="text-base">{statut.icon}</span>
                        <span className="text-xs text-gray-500">{statut.label}</span>
                      </div>

                      {/* Période de validité */}
                      <p className="mt-1 text-xs text-gray-500">
                        📅 Période de validité :{' '}
                        <span className="font-medium text-gray-700">
                          {formatDate(r.date_debut)} — {formatDate(r.date_fin)}
                        </span>
                        {(!r.date_debut && !r.date_fin) && (
                          <span className="italic text-gray-400"> (non renseignée)</span>
                        )}
                      </p>

                      {/* Barre de progression */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all ${statut.barColor}`}
                            style={{ width: `${Math.min(100, pctNum).toFixed(1)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-10 text-right">
                          {pctNum.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Chiffres clés */}
                    <div className="flex-shrink-0 text-right space-y-0.5">
                      <p className="text-xs text-gray-500">Montant global</p>
                      <p className="text-base font-bold text-gray-900">{formatMontant(r.montant_global)}</p>
                      <p className="text-xs text-gray-500">
                        Consommé&nbsp;
                        <span className="font-semibold text-gray-700">{formatMontant(consomme)}</span>
                      </p>
                      <p className={`text-xs font-semibold ${restant >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Restant {formatMontant(restant)}
                      </p>
                    </div>

                    {/* Chevron */}
                    <span className="flex-shrink-0 text-gray-400 mt-1">
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </div>
                </button>

                {/* ── Détail par action (expandable) ── */}
                {isOpen && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Année</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Statut</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Période convention</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Affecté</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Charges action</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Restant action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {r.actions_detail.map(a => {
                          const restantAction = a.montant_affecte - a.total_charges;
                          return (
                            <tr key={a.action_id} className="hover:bg-white">
                              <td className="px-4 py-2 font-medium text-gray-800">
                                <Link
                                  href={`/dashboard/actions/${a.action_id}`}
                                  className="hover:text-navy hover:underline"
                                >
                                  {a.action_nom}
                                </Link>
                              </td>
                              <td className="px-4 py-2 text-center text-gray-600">{a.annee}</td>
                              <td className="px-4 py-2 text-center">
                                <span className="text-xs text-gray-500">
                                  {STATUT_LABELS[a.statut] ?? a.statut}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-600">
                                {formatDate(a.date_debut)} — {formatDate(a.date_fin)}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-700">
                                {formatMontant(a.montant_affecte)}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-700">
                                {formatMontant(a.total_charges)}
                              </td>
                              <td className={`px-4 py-2 text-right font-semibold ${restantAction >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatMontant(restantAction)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Pied de tableau */}
                      <tfoot>
                        <tr className="border-t-2 border-navy/20 bg-white">
                          <td colSpan={4} className="px-4 py-2 text-right text-sm font-semibold text-gray-700">
                            TOTAL {r.financeur}
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-bold text-blue-700">
                            {formatMontant(r.montant_global)}
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-bold text-gray-800">
                            {formatMontant(consomme)}
                          </td>
                          <td className={`px-4 py-2 text-right text-sm font-bold ${restant >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatMontant(restant)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
