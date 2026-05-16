'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatMontant, formatPourcentage } from '@/lib/utils';

interface Action       { id: number; nom: string; annee: number; statut: string }
interface DepFonct     { id: number; libelle: string; code_compte: string; montant: number }
interface DepPersonnel {
  id: number; emploi_libelle: string; agent_nom: string;
  pourcentage_affectation: number; heures: number; montant: number;
}
interface Prestation   { id: number; libelle: string; cout_horaire: number; nb_heures: number; montant: number }
interface Ressource    { id: number; financeur: string; type_financement: string; montant: number }

function GroupHeader({ label, color, total }: { label: string; color: string; total: number }) {
  return (
    <tr className={`${color} border-t border-b`}>
      <td colSpan={3} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide">{label}</td>
      <td className="px-3 py-1.5 text-right text-xs font-bold">{formatMontant(total)}</td>
    </tr>
  );
}

export default function BudgetActionPage() {
  const [actions,    setActions]    = useState<Action[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fonct,      setFonct]      = useState<DepFonct[]>([]);
  const [personnel,  setPersonnel]  = useState<DepPersonnel[]>([]);
  const [prestations,setPrestations]= useState<Prestation[]>([]);
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    fetch('/api/actions').then(r => r.json()).then((data: Action[]) => {
      setActions(data);
      if (data.length > 0) setSelectedId(data[0].id);
    });
  }, []);

  const loadAll = useCallback(() => {
    if (!selectedId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/depenses-fonctionnement?action_id=${selectedId}`).then(r => r.json()),
      fetch(`/api/depenses?action_id=${selectedId}`).then(r => r.json()),
      fetch(`/api/prestations?action_id=${selectedId}`).then(r => r.json()),
      fetch(`/api/ressources?action_id=${selectedId}`).then(r => r.json()),
    ]).then(([f, p, pr, r]) => {
      setFonct(f);
      setPersonnel(p);
      setPrestations(pr);
      setRessources(r);
      setLoading(false);
    });
  }, [selectedId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── Totals ── */
  const totalFonct    = fonct.reduce((s, d) => s + Number(d.montant), 0);
  const totalPersonnel= personnel.reduce((s, d) => s + Number(d.montant), 0);
  const totalPrest    = prestations.reduce((s, p) => s + Number(p.montant), 0);
  const totalCharges  = totalFonct + totalPersonnel + totalPrest;
  const totalProduits = ressources.reduce((s, r) => s + Number(r.montant), 0);
  const solde         = totalProduits - totalCharges;

  const selectedAction = actions.find(a => a.id === selectedId);

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget action</h1>
          <p className="text-sm text-gray-500 mt-0.5">Synthèse financière par action — données liées aux Actions / Projets</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Action :</label>
          <select value={selectedId ?? ''} onChange={e => setSelectedId(parseInt(e.target.value))} className="input w-72">
            {actions.map(a => <option key={a.id} value={a.id}>{a.nom} ({a.annee})</option>)}
          </select>
        </div>
      </div>

      {!selectedId ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-3xl mb-2">📊</p>
          <p>Sélectionnez une action pour afficher son budget.</p>
        </div>
      ) : loading ? (
        <div className="card p-12 text-center text-gray-400">Chargement...</div>
      ) : (
        <>
          {/* ── Link to edit ── */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Les données ci-dessous sont saisies dans{' '}
              <Link href={`/dashboard/actions/${selectedId}`} className="text-navy font-medium hover:underline">
                Actions / Projets → {selectedAction?.nom}
              </Link>
            </p>
            <Link href={`/dashboard/actions/${selectedId}`} className="btn-primary py-1 text-xs">
              Modifier les données →
            </Link>
          </div>

          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              { label: 'Fonctionnement', val: totalFonct,     color: 'text-orange-600' },
              { label: 'Personnel',      val: totalPersonnel, color: 'text-purple-600' },
              { label: 'Prestations',    val: totalPrest,     color: 'text-blue-600'   },
              { label: 'Total charges',  val: totalCharges,   color: 'text-red-600'    },
              { label: 'Total produits', val: totalProduits,  color: 'text-green-600'  },
            ].map(s => (
              <div key={s.label} className="card p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                <p className={`mt-1 text-sm font-bold ${s.color}`}>{formatMontant(s.val)}</p>
              </div>
            ))}
          </div>

          {/* ── Two-column layout ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* ── CHARGES ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b-2 border-red-400 pb-2">
                <h2 className="text-base font-bold text-red-700 uppercase tracking-wide">Charges</h2>
                <span className="text-sm font-semibold text-red-600">{formatMontant(totalCharges)}</span>
              </div>

              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-16">Code</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Libellé / Détail</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-36">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">

                    {/* ── Fonctionnement ── */}
                    {fonct.length > 0 && (
                      <>
                        <GroupHeader label="Dépenses de fonctionnement" color="bg-orange-50 text-orange-800" total={totalFonct} />
                        {fonct.map(d => (
                          <tr key={`f-${d.id}`} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5 font-mono text-xs text-gray-400">{d.code_compte || '—'}</td>
                            <td className="px-3 py-1.5 text-gray-800">{d.libelle}</td>
                            <td className="px-3 py-1.5 text-right font-medium text-gray-700">{formatMontant(d.montant)}</td>
                          </tr>
                        ))}
                      </>
                    )}

                    {/* ── Personnel ── */}
                    {personnel.length > 0 && (
                      <>
                        <GroupHeader label="Dépenses de personnel" color="bg-purple-50 text-purple-800" total={totalPersonnel} />
                        {personnel.map(d => (
                          <tr key={`p-${d.id}`} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5 text-xs text-gray-400">
                              {formatPourcentage(d.pourcentage_affectation)}
                            </td>
                            <td className="px-3 py-1.5 text-gray-800">
                              {d.emploi_libelle}
                              {d.agent_nom && <span className="text-xs text-gray-400 ml-1">– {d.agent_nom}</span>}
                              <span className="text-xs text-gray-400 ml-1">({Number(d.heures).toFixed(0)} h)</span>
                            </td>
                            <td className="px-3 py-1.5 text-right font-medium text-gray-700">{formatMontant(d.montant)}</td>
                          </tr>
                        ))}
                      </>
                    )}

                    {/* ── Prestations ── */}
                    {prestations.length > 0 && (
                      <>
                        <GroupHeader label="Prestations de services" color="bg-blue-50 text-blue-800" total={totalPrest} />
                        {prestations.map(p => (
                          <tr key={`ps-${p.id}`} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5 text-xs text-gray-400">
                              {Number(p.nb_heures).toFixed(0)} h
                            </td>
                            <td className="px-3 py-1.5 text-gray-800">
                              {p.libelle}
                              {p.cout_horaire > 0 && <span className="text-xs text-gray-400 ml-1">à {formatMontant(p.cout_horaire)}/h</span>}
                            </td>
                            <td className="px-3 py-1.5 text-right font-medium text-gray-700">{formatMontant(p.montant)}</td>
                          </tr>
                        ))}
                      </>
                    )}

                    {(fonct.length === 0 && personnel.length === 0 && prestations.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-xs text-gray-400 italic">
                          Aucune charge — saisissez les données dans Actions / Projets
                        </td>
                      </tr>
                    )}

                    {/* ── Total charges ── */}
                    {(fonct.length > 0 || personnel.length > 0 || prestations.length > 0) && (
                      <tr className="border-t-2 border-red-300 bg-red-50">
                        <td colSpan={2} className="px-3 py-2 text-right text-sm font-bold text-red-800">TOTAL CHARGES</td>
                        <td className="px-3 py-2 text-right text-sm font-bold text-red-700">{formatMontant(totalCharges)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── PRODUITS ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b-2 border-green-500 pb-2">
                <h2 className="text-base font-bold text-green-700 uppercase tracking-wide">Produits</h2>
                <span className="text-sm font-semibold text-green-600">{formatMontant(totalProduits)}</span>
              </div>

              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Financeur</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-36">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ressources.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-xs text-gray-400 italic">
                          Aucune ressource — saisissez les données dans Actions / Projets
                        </td>
                      </tr>
                    ) : (
                      <>
                        {ressources.map(r => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5 font-medium text-gray-800">{r.financeur}</td>
                            <td className="px-3 py-1.5 text-gray-500 text-xs">{r.type_financement || '—'}</td>
                            <td className="px-3 py-1.5 text-right font-medium text-gray-700">{formatMontant(r.montant)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-green-300 bg-green-50">
                          <td colSpan={2} className="px-3 py-2 text-right text-sm font-bold text-green-800">TOTAL PRODUITS</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-green-700">{formatMontant(totalProduits)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Solde ── */}
          <div className={`card p-5 flex items-center justify-between border ${solde >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <div>
              <p className="text-sm font-semibold text-gray-700">
                {solde >= 0 ? '✅ Excédent budgétaire' : '⚠️ Déficit budgétaire'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Produits ({formatMontant(totalProduits)}) − Charges ({formatMontant(totalCharges)})
              </p>
            </div>
            <p className={`text-2xl font-bold ${solde >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {solde >= 0 ? '+' : '−'}{formatMontant(Math.abs(solde))}
            </p>
          </div>

          {/* ── Taux de couverture ── */}
          {totalCharges > 0 && (
            <div className="card p-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Taux de couverture</p>
                <p className={`text-lg font-bold mt-0.5 ${totalProduits >= totalCharges ? 'text-green-700' : 'text-red-600'}`}>
                  {((totalProduits / totalCharges) * 100).toFixed(1)} %
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Reste à financer</p>
                <p className={`text-lg font-bold mt-0.5 ${solde >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {solde >= 0 ? formatMontant(0) : formatMontant(Math.abs(solde))}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
