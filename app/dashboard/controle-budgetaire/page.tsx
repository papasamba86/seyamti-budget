'use client';
import { useState, useEffect, useCallback } from 'react';
import { formatMontant } from '@/lib/utils';

interface LigneControle {
  id: number;
  code_compte: string;
  categorie: string;
  sous_categorie: string;
  montant_annuel: number;
  controle_id: number | null;
  montant_prevu: number | null;
  montant_realise: number | null;
  commentaire: string | null;
}

const MOIS_LABELS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function getStatut(prevu: number, realise: number | null): { icon: string; label: string } {
  if (realise === null || realise === 0) return { icon: '⚪', label: 'Pas de saisie' };
  if (realise > prevu) return { icon: '🔴', label: 'Dépassement' };
  if (prevu > 0 && realise / prevu > 0.9) return { icon: '🟡', label: 'Attention' };
  return { icon: '🟢', label: 'OK' };
}

export default function ControleBudgetairePage() {
  const now = new Date();
  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [lignes, setLignes] = useState<LigneControle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRealise, setEditingRealise] = useState<Record<number, string>>({});
  const [editingCommentaire, setEditingCommentaire] = useState<Record<number, string>>({});

  const reload = useCallback(() => {
    setLoading(true);
    fetch(`/api/controle-budgetaire?annee=${annee}&mois=${mois}`)
      .then(r => r.json())
      .then(data => {
        const rows: LigneControle[] = Array.isArray(data) ? data : (data.data ?? []);
        // Neon renvoie les colonnes NUMERIC en string → coercion Number()
        setLignes(rows.map(l => ({
          ...l,
          montant_annuel:  Number(l.montant_annuel  ?? 0),
          montant_prevu:   l.montant_prevu   != null ? Number(l.montant_prevu)   : null,
          montant_realise: l.montant_realise != null ? Number(l.montant_realise) : null,
        })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [annee, mois]);

  useEffect(() => {
    reload();
  }, [reload]);

  function getPrevuMensuel(l: LigneControle): number {
    if (l.montant_prevu !== null && l.montant_prevu > 0) return l.montant_prevu;
    return Math.round((l.montant_annuel / 12) * 100) / 100;
  }

  function getRealise(l: LigneControle): number {
    if (editingRealise[l.id] !== undefined) return parseFloat(editingRealise[l.id]) || 0;
    return l.montant_realise ?? 0;
  }

  function getCommentaire(l: LigneControle): string {
    if (editingCommentaire[l.id] !== undefined) return editingCommentaire[l.id];
    return l.commentaire ?? '';
  }

  async function saveControle(l: LigneControle) {
    const prevu = getPrevuMensuel(l);
    const realise = getRealise(l);
    const commentaire = getCommentaire(l);

    await fetch('/api/controle-budgetaire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        budget_ligne_id: l.id,
        annee,
        mois,
        montant_prevu: prevu,
        montant_realise: realise,
        commentaire,
      }),
    });
    reload();
  }

  function handleRealiseBlur(l: LigneControle) {
    saveControle(l);
  }

  function handleCommentaireBlur(l: LigneControle) {
    saveControle(l);
  }

  const totaux = lignes.reduce(
    (acc, l) => {
      const prevu = getPrevuMensuel(l);
      const realise = getRealise(l);
      acc.totalPrevu += prevu;
      acc.totalRealise += realise;
      if (realise > prevu) acc.nbDepassements += 1;
      return acc;
    },
    { totalPrevu: 0, totalRealise: 0, nbDepassements: 0 }
  );
  const solde = totaux.totalPrevu - totaux.totalRealise;

  const annees = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrôle Budgétaire Mensuel</h1>
          <p className="text-sm text-gray-500">Suivi des charges par mois</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={annee}
            onChange={e => setAnnee(parseInt(e.target.value))}
            className="input w-28"
          >
            {annees.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={mois}
            onChange={e => setMois(parseInt(e.target.value))}
            className="input w-36"
          >
            {MOIS_LABELS.slice(1).map((label, i) => (
              <option key={i + 1} value={i + 1}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Alert dépassements */}
      {totaux.nbDepassements > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
          ⚠️ {totaux.nbDepassements} ligne{totaux.nbDepassements > 1 ? 's' : ''} en dépassement budgétaire
        </div>
      )}

      {/* Cards résumé */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total prévu mensuel', val: formatMontant(totaux.totalPrevu), color: 'text-blue-700' },
          { label: 'Total réalisé',       val: formatMontant(totaux.totalRealise), color: 'text-gray-800' },
          { label: 'Solde',               val: formatMontant(solde), color: solde >= 0 ? 'text-green-600' : 'text-red-600' },
          { label: 'Dépassements',        val: `${totaux.nbDepassements} ligne${totaux.nbDepassements > 1 ? 's' : ''}`, color: totaux.nbDepassements > 0 ? 'text-red-600' : 'text-gray-500' },
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
      ) : lignes.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          Aucune ligne de charge pour {MOIS_LABELS[mois]} {annee}.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-head px-3 py-3 text-left">Code</th>
                <th className="table-head px-3 py-3 text-left">Catégorie / Sous-cat.</th>
                <th className="table-head px-3 py-3 text-right">Prévu mensuel</th>
                <th className="table-head px-3 py-3 text-right">Réalisé</th>
                <th className="table-head px-3 py-3 text-right">Écart</th>
                <th className="table-head px-3 py-3 text-right">%</th>
                <th className="table-head px-3 py-3 text-center">Statut</th>
                <th className="table-head px-3 py-3 text-left">Commentaire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lignes.map(l => {
                const prevu = getPrevuMensuel(l);
                const realise = getRealise(l);
                const ecart = prevu - realise;
                const pct = prevu > 0 ? ((realise / prevu) * 100).toFixed(0) : '–';
                const statut = getStatut(prevu, l.montant_realise);
                const isDepassement = realise > prevu;

                return (
                  <tr
                    key={l.id}
                    className={isDepassement ? 'bg-red-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{l.code_compte || '–'}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-gray-800">{l.categorie}</span>
                      {l.sous_categorie && (
                        <span className="block text-xs text-gray-400">{l.sous_categorie}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">{formatMontant(prevu)}</td>
                    <td className="px-3 py-2 text-right">
                      {editingRealise[l.id] !== undefined ? (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          autoFocus
                          className="input w-28 text-right py-0.5 px-1 text-sm"
                          value={editingRealise[l.id]}
                          onChange={e => setEditingRealise(prev => ({ ...prev, [l.id]: e.target.value }))}
                          onBlur={() => {
                            handleRealiseBlur(l);
                            setEditingRealise(prev => {
                              const next = { ...prev };
                              delete next[l.id];
                              return next;
                            });
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => setEditingRealise(prev => ({ ...prev, [l.id]: String(realise) }))}
                          className="w-full text-right hover:underline cursor-pointer font-semibold text-gray-800"
                        >
                          {formatMontant(realise)}
                        </button>
                      )}
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold ${ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatMontant(ecart)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">{pct}{pct !== '–' ? '%' : ''}</td>
                    <td className="px-3 py-2 text-center" title={statut.label}>{statut.icon}</td>
                    <td className="px-3 py-2">
                      {editingCommentaire[l.id] !== undefined ? (
                        <textarea
                          autoFocus
                          rows={2}
                          className="input w-full text-sm py-0.5 px-1 resize-none"
                          value={editingCommentaire[l.id]}
                          onChange={e => setEditingCommentaire(prev => ({ ...prev, [l.id]: e.target.value }))}
                          onBlur={() => {
                            handleCommentaireBlur(l);
                            setEditingCommentaire(prev => {
                              const next = { ...prev };
                              delete next[l.id];
                              return next;
                            });
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => setEditingCommentaire(prev => ({ ...prev, [l.id]: getCommentaire(l) }))}
                          className="w-full text-left text-gray-500 hover:underline cursor-pointer text-xs italic min-w-[80px]"
                        >
                          {getCommentaire(l) || 'Ajouter…'}
                        </button>
                      )}
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
