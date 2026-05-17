'use client';
import { useState, useEffect } from 'react';
import { formatMontant } from '@/lib/utils';

interface ActionSuivi {
  id: number;
  nom: string;
  annee: number;
  statut: string;
  total_alloue: number;
  total_charges: number;
}

interface Ressource {
  id: number;
  action_id: number;
  action_nom: string;
  financeur: string;
  montant: number;
  type_financement: string;
}

interface SuiviData {
  actions: ActionSuivi[];
  ressources: Ressource[];
}

function getStatut(alloue: number, restant: number): { icon: string; label: string; rowClass: string } {
  if (alloue <= 0) return { icon: '⚪', label: 'Aucune ressource', rowClass: '' };
  const pct = restant / alloue;
  if (pct <= 0.1) return { icon: '🔴', label: 'ALERTE', rowClass: 'bg-red-50 border-l-4 border-red-500' };
  if (pct <= 0.25) return { icon: '🟡', label: 'ATTENTION', rowClass: 'bg-yellow-50 border-l-4 border-yellow-400' };
  return { icon: '🟢', label: 'OK', rowClass: '' };
}

export default function SuiviRessourcesPage() {
  const [data, setData] = useState<SuiviData>({ actions: [], ressources: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/suivi-ressources')
      .then(r => r.json())
      .then(res => {
        setData(res.data ?? res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const { actions, ressources } = data;

  // Group resources by action_id
  const ressourcesByAction = ressources.reduce<Record<number, Ressource[]>>((acc, r) => {
    (acc[r.action_id] ??= []).push(r);
    return acc;
  }, {});

  const alertCount = actions.filter(a => {
    const restant = Number(a.total_alloue) - Number(a.total_charges);
    return Number(a.total_alloue) > 0 && restant / Number(a.total_alloue) <= 0.1;
  }).length;

  const totalAlloue = actions.reduce((s, a) => s + Number(a.total_alloue), 0);
  const totalCharges = actions.reduce((s, a) => s + Number(a.total_charges), 0);
  const totalRestant = totalAlloue - totalCharges;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suivi Affectation des Ressources</h1>
        <p className="text-sm text-gray-500">Consommation des ressources par action</p>
      </div>

      {/* Alert banner */}
      {alertCount > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
          ⚠️ {alertCount} action{alertCount > 1 ? 's' : ''} ont moins de 10% de ressources restantes
        </div>
      )}

      {/* Cards résumé */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Actions suivies',  val: String(actions.length), color: 'text-navy' },
          { label: 'Total alloué',     val: formatMontant(totalAlloue), color: 'text-blue-700' },
          { label: 'Total consommé',   val: formatMontant(totalCharges), color: 'text-gray-800' },
          { label: 'Total restant',    val: formatMontant(totalRestant), color: totalRestant >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map(card => (
          <div key={card.label} className="card p-4 text-center">
            <p className="text-xs font-medium text-gray-500 uppercase leading-tight">{card.label}</p>
            <p className={`mt-1 text-lg font-bold ${card.color}`}>{card.val}</p>
          </div>
        ))}
      </div>

      {/* Tableau */}
      {loading ? (
        <p className="text-gray-400 text-sm">Chargement...</p>
      ) : actions.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          Aucune action trouvée.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-head px-3 py-3 text-left">Action</th>
                <th className="table-head px-3 py-3 text-center">Année</th>
                <th className="table-head px-3 py-3 text-left">Financeur(s)</th>
                <th className="table-head px-3 py-3 text-left">Type</th>
                <th className="table-head px-3 py-3 text-right">Alloué</th>
                <th className="table-head px-3 py-3 text-right">Charges</th>
                <th className="table-head px-3 py-3 text-right">Restant</th>
                <th className="table-head px-3 py-3 text-right">% consommé</th>
                <th className="table-head px-3 py-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {actions.map(a => {
                const alloue = Number(a.total_alloue);
                const charges = Number(a.total_charges);
                const restant = alloue - charges;
                const pctConsomme = alloue > 0 ? ((charges / alloue) * 100).toFixed(0) : null;
                const statut = getStatut(alloue, restant);
                const actionRessources = ressourcesByAction[a.id] ?? [];

                return (
                  <tr key={a.id} className={`${statut.rowClass} hover:brightness-95 transition-all`}>
                    <td className="px-3 py-2 font-medium text-gray-800">{a.nom}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{a.annee}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {actionRessources.length > 0 ? (
                          actionRessources.map(r => (
                            <span
                              key={r.id}
                              className="inline-block rounded-full bg-blue-100 text-blue-800 text-xs px-2 py-0.5 font-medium"
                            >
                              {r.financeur}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs italic">Aucun</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {actionRessources.length > 0 ? (
                          Array.from(new Set(actionRessources.map(r => r.type_financement).filter(Boolean))).map((type, i) => (
                            <span
                              key={i}
                              className="inline-block rounded-full bg-gray-100 text-gray-600 text-xs px-2 py-0.5"
                            >
                              {type}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-300">–</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">{formatMontant(alloue)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{formatMontant(charges)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${restant >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatMontant(restant)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {pctConsomme !== null ? `${pctConsomme}%` : '–'}
                    </td>
                    <td className="px-3 py-2 text-center" title={statut.label}>
                      {statut.icon}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
