'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { FONDS_CONFIG, calculerTauxApplicable } from '@/lib/reglementation/fonds.config';
import { LABELS_TYPE_STRUCTURE, LABELS_PIECES, type TypeStructure } from '@/lib/reglementation/types';

interface FullFiche {
  id: number;
  titre: string;
  fonds_id: string;
  statut: string;
  type_structure: string;
  porteur_nom: string;
  porteur_siret: string;
  porteur_adresse: string;
  porteur_cp: string;
  porteur_ville: string;
  porteur_contact: string;
  porteur_email: string;
  porteur_telephone: string;
  projet_titre: string;
  projet_description: string;
  projet_objectifs: string;
  projet_territoire: string;
  projet_localisation: string;
  projet_date_debut: string | null;
  projet_date_fin: string | null;
  cout_total: number;
  montant_subvention_demande: number;
  taux_subvention: number;
  is_qpv: boolean;
  is_npnru: boolean;
  is_domtom: boolean;
  is_zone_rurale: boolean;
  is_zone_montagne: boolean;
  ph_egalite_hf: boolean;
  ph_non_discrimination: boolean;
  ph_developpement_durable: boolean;
  ph_details: string;
  taux_indirect: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  financements: Array<{
    id: number; financeur: string; fonds_id_ref: string;
    montant: number; taux: number; type_financement: string; confirme: boolean;
  }>;
  budget: Array<{
    id: number; type_depense: string; categorie: string;
    libelle: string; montant: number; eligible: boolean;
  }>;
  pieces: Array<{
    id: number; code_piece: string; libelle: string; statut: string;
  }>;
}

const STATUT_LABELS: Record<string, { label: string; cls: string }> = {
  brouillon:  { label: 'Brouillon',   cls: 'bg-gray-100 text-gray-700' },
  en_cours:   { label: 'En cours',    cls: 'bg-blue-100 text-blue-700' },
  soumis:     { label: 'Soumis',      cls: 'bg-yellow-100 text-yellow-700' },
  valide:     { label: 'Validé',      cls: 'bg-green-100 text-green-700' },
  refuse:     { label: 'Refusé',      cls: 'bg-red-100 text-red-700' },
  archive:    { label: 'Archivé',     cls: 'bg-purple-100 text-purple-700' },
};

function formatEur(n: number | null | undefined) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(n ?? 0));
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR');
}

type Tab = 'apercu' | 'budget' | 'financement' | 'pieces' | 'conformite';

export default function FicheDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string, 10);

  const [fiche, setFiche] = useState<FullFiche | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('apercu');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/fiches-projet/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setFiche(data); setLoading(false); });
  }, [id]);

  async function handleDelete() {
    if (!confirm('Supprimer définitivement cette fiche projet ?')) return;
    setDeleting(true);
    await fetch(`/api/fiches-projet/${id}`, { method: 'DELETE' });
    router.push('/dashboard/fiches-projet');
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Chargement...</div>;
  if (!fiche) return (
    <div className="p-8 text-center">
      <p className="text-gray-500 mb-4">Fiche projet introuvable ou accès refusé.</p>
      <Link href="/dashboard/fiches-projet" className="text-navy hover:underline">← Retour à la liste</Link>
    </div>
  );

  const config = FONDS_CONFIG[fiche.fonds_id];
  const territoire = { isQPV: fiche.is_qpv, isNPNRU: fiche.is_npnru, isDOMTOM: fiche.is_domtom, isZoneRurale: fiche.is_zone_rurale, isZoneMontagne: fiche.is_zone_montagne };
  const tauxApplicable = calculerTauxApplicable(fiche.fonds_id, territoire);
  const statut = STATUT_LABELS[fiche.statut] ?? { label: fiche.statut, cls: 'bg-gray-100 text-gray-700' };

  const totalBudget = fiche.budget.reduce((s, b) => s + Number(b.montant ?? 0), 0);
  const totalFinancement = fiche.financements.reduce((s, f) => s + Number(f.montant ?? 0), 0);
  const piecesOk = fiche.pieces.filter(p => p.statut === 'fournie').length;

  // Alertes réglementaires
  const alertes: Array<{ msg: string; level: string }> = [];
  if (config) {
    if (Number(fiche.taux_subvention) > config.tauxMax) {
      alertes.push({ msg: `Taux (${Number(fiche.taux_subvention).toFixed(1)}%) dépasse le maximum réglementaire (${config.tauxMax}%)`, level: 'error' });
    }
    if (config.principesHorizontauxObligatoires && (!fiche.ph_egalite_hf || !fiche.ph_non_discrimination || !fiche.ph_developpement_durable)) {
      alertes.push({ msg: 'Principes horizontaux incomplets — obligatoires pour ce fonds', level: 'error' });
    }
    if (Math.abs(totalFinancement - Number(fiche.cout_total)) > 1 && fiche.financements.length > 0) {
      alertes.push({ msg: `Déséquilibre plan de financement : ${formatEur(totalFinancement)} vs ${formatEur(Number(fiche.cout_total))} budget`, level: 'warning' });
    }
  }

  const TABS: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'apercu', label: 'Aperçu', icon: '📋' },
    { id: 'budget', label: `Budget (${fiche.budget.length})`, icon: '💰' },
    { id: 'financement', label: `Financement (${fiche.financements.length})`, icon: '🏦' },
    { id: 'pieces', label: `Pièces (${piecesOk}/${fiche.pieces.length})`, icon: '📁' },
    { id: 'conformite', label: `Conformité${alertes.length > 0 ? ` ⚠️` : ' ✅'}`, icon: '🛡️' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* En-tête */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/fiches-projet" className="text-gray-400 hover:text-navy text-sm">← Fiches projet</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600">FP-{String(fiche.id).padStart(4, '0')}</span>
          </div>
          <h1 className="text-2xl font-bold text-navy">{fiche.titre}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statut.cls}`}>{statut.label}</span>
            <span className="text-gray-400 text-xs">Modifié le {formatDate(fiche.updated_at)}</span>
            <span className="text-gray-400 text-xs">par {fiche.created_by_name}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/fiches-projet/${id}/print`}
            target="_blank"
            className="flex items-center gap-1.5 bg-gold text-navy px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gold-light transition-colors"
          >
            📄 Dossier PDF
          </Link>
          <Link
            href={`/dashboard/fiches-projet/nouveau?edit=${id}`}
            className="flex items-center gap-1.5 bg-navy text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-navy-light transition-colors"
          >
            ✏️ Modifier
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-navy">{formatEur(Number(fiche.cout_total))}</p>
          <p className="text-xs text-gray-500 mt-1">Coût total projet</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{formatEur(Number(fiche.montant_subvention_demande))}</p>
          <p className="text-xs text-gray-500 mt-1">Subvention demandée</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-navy">{Number(fiche.taux_subvention).toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">Taux (max {config?.tauxMax ?? '—'}%)</p>
          {tauxApplicable > 0 && tauxApplicable !== Number(fiche.taux_subvention) && (
            <p className="text-xs text-orange-500">Taux applicable : {tauxApplicable}%</p>
          )}
        </div>
        <div className={`bg-white rounded-xl border shadow-sm p-4 text-center ${alertes.filter(a => a.level === 'error').length > 0 ? 'border-red-200' : 'border-gray-100'}`}>
          <p className={`text-2xl font-bold ${alertes.filter(a => a.level === 'error').length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {alertes.filter(a => a.level === 'error').length > 0 ? `${alertes.filter(a => a.level === 'error').length} erreur(s)` : 'Conforme'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Réglementation</p>
        </div>
      </div>

      {/* Encart réglementaire */}
      {config && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-blue-800 text-sm">{config.nom}</p>
              <p className="text-xs text-blue-600 mt-0.5">{config.reglementBase}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-600">Taux standard : <strong>{config.tauxStandard ?? config.tauxMax}%</strong> → max <strong>{config.tauxMax}%</strong></p>
              {config.gestionnaire && <p className="text-xs text-blue-500">{config.gestionnaire}</p>}
            </div>
          </div>
          {config.mentionObligatoire && (
            <div className="mt-2 bg-blue-100 rounded-lg p-2 text-xs text-blue-800 font-medium">
              {config.mentionObligatoire}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'border-navy text-navy'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ONGLET APERÇU ─────────────────────────────────────────────── */}
      {tab === 'apercu' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4">Porteur de projet</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Nom / Raison sociale</p>
                <p className="font-medium text-gray-800 mt-0.5">{fiche.porteur_nom || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">SIRET</p>
                <p className="font-medium text-gray-800 mt-0.5">{fiche.porteur_siret || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Type de structure</p>
                <p className="font-medium text-gray-800 mt-0.5">{LABELS_TYPE_STRUCTURE[fiche.type_structure as TypeStructure] ?? fiche.type_structure}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Contact</p>
                <p className="font-medium text-gray-800 mt-0.5">{fiche.porteur_contact || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Adresse</p>
                <p className="font-medium text-gray-800 mt-0.5">
                  {[fiche.porteur_adresse, fiche.porteur_cp, fiche.porteur_ville].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4">Description du projet</h3>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Intitulé</p>
                <p className="font-medium text-gray-800 mt-0.5">{fiche.projet_titre || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Territoire</p>
                <p className="font-medium text-gray-800 mt-0.5">{fiche.projet_territoire || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Dates</p>
                <p className="font-medium text-gray-800 mt-0.5">
                  {formatDate(fiche.projet_date_debut)} → {formatDate(fiche.projet_date_fin)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Caractéristiques territoriales</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {fiche.is_qpv && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">QPV</span>}
                  {fiche.is_npnru && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">NPNRU</span>}
                  {fiche.is_domtom && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">DOM-TOM</span>}
                  {fiche.is_zone_rurale && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">Rural</span>}
                  {fiche.is_zone_montagne && <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">Montagne</span>}
                  {!fiche.is_qpv && !fiche.is_npnru && !fiche.is_domtom && !fiche.is_zone_rurale && !fiche.is_zone_montagne && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">Standard</span>
                  )}
                </div>
              </div>
            </div>
            {fiche.projet_description && (
              <div className="mb-3">
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{fiche.projet_description}</p>
              </div>
            )}
            {fiche.projet_objectifs && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Objectifs</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{fiche.projet_objectifs}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ONGLET BUDGET ─────────────────────────────────────────────── */}
      {tab === 'budget' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {fiche.budget.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Aucune ligne de budget renseignée.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Catégorie</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Libellé</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Montant HT</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Éligible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fiche.budget.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">{b.type_depense}</td>
                    <td className="px-4 py-3 text-gray-700">{b.categorie}</td>
                    <td className="px-4 py-3 text-gray-700">{b.libelle}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatEur(Number(b.montant))}</td>
                    <td className="px-4 py-3 text-center">
                      {b.eligible
                        ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">Oui</span>
                        : <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">Non</span>
                      }
                    </td>
                  </tr>
                ))}
                <tr className="bg-navy/5 font-bold">
                  <td colSpan={3} className="px-4 py-3">Total budget prévisionnel</td>
                  <td className="px-4 py-3 text-right text-navy">{formatEur(totalBudget)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── ONGLET FINANCEMENT ────────────────────────────────────────── */}
      {tab === 'financement' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {fiche.financements.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Aucun financement renseigné.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Financeur</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Montant</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Taux</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {fiche.financements.map(f => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{f.financeur}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{f.type_financement || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">{formatEur(Number(f.montant))}</td>
                      <td className="px-4 py-3 text-right">{Number(f.taux).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center">
                        {f.confirme
                          ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">Confirmé</span>
                          : <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">En attente</span>
                        }
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-navy/5 font-bold">
                    <td colSpan={2} className="px-4 py-3">Total plan de financement</td>
                    <td className="px-4 py-3 text-right text-green-700">{formatEur(totalFinancement)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Équilibre */}
          <div className={`rounded-xl p-4 ${Math.abs(totalFinancement - Number(fiche.cout_total)) < 1 ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
            <p className="text-sm font-bold">
              {Math.abs(totalFinancement - Number(fiche.cout_total)) < 1 ? '✅ Budget équilibré' : '⚠️ Déséquilibre budgétaire'}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Budget total : {formatEur(Number(fiche.cout_total))} | Financements : {formatEur(totalFinancement)} |
              Écart : {formatEur(Math.abs(totalFinancement - Number(fiche.cout_total)))}
            </p>
          </div>
        </div>
      )}

      {/* ── ONGLET PIÈCES ─────────────────────────────────────────────── */}
      {tab === 'pieces' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {fiche.pieces.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Aucune pièce justificative listée.
              {config?.piecesjustificatives && (
                <p className="mt-2 text-xs">
                  Ce fonds requiert {config.piecesjustificatives.length} pièces.
                  Modifier la fiche pour les ajouter.
                </p>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 w-8"></th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Pièce justificative</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fiche.pieces.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 ${p.statut === 'fournie' ? 'bg-green-50/30' : ''}`}>
                    <td className="px-4 py-3 text-center text-lg">
                      {p.statut === 'fournie' ? '✅' : p.statut === 'non_applicable' ? '➖' : '⬜'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{LABELS_PIECES[p.code_piece] ?? p.libelle}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.statut === 'fournie' ? 'bg-green-100 text-green-700'
                        : p.statut === 'non_applicable' ? 'bg-gray-100 text-gray-600'
                        : 'bg-orange-100 text-orange-700'
                      }`}>
                        {p.statut === 'fournie' ? 'Fournie' : p.statut === 'non_applicable' ? 'N/A' : 'À fournir'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            {piecesOk} / {fiche.pieces.length} pièces fournies
          </div>
        </div>
      )}

      {/* ── ONGLET CONFORMITÉ ─────────────────────────────────────────── */}
      {tab === 'conformite' && (
        <div className="space-y-5">
          {/* Alertes */}
          {alertes.length === 0 ? (
            <div className="flex items-center gap-3 p-5 bg-green-50 border border-green-200 rounded-xl">
              <span className="text-3xl">✅</span>
              <div>
                <p className="font-bold text-green-800">Aucune alerte réglementaire</p>
                <p className="text-sm text-green-600">Ce dossier est conforme aux exigences du fonds {config?.nom}.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {alertes.map((a, i) => (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${
                  a.level === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <span className="text-xl">{a.level === 'error' ? '❌' : '⚠️'}</span>
                  <p className={`text-sm font-medium ${a.level === 'error' ? 'text-red-800' : 'text-yellow-800'}`}>{a.msg}</p>
                </div>
              ))}
            </div>
          )}

          {/* Principes horizontaux */}
          {config?.principesHorizontauxObligatoires && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-3">Principes horizontaux obligatoires</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'ph_egalite_hf', label: 'Égalité femmes / hommes' },
                  { key: 'ph_non_discrimination', label: 'Non-discrimination' },
                  { key: 'ph_developpement_durable', label: 'Développement durable' },
                ].map(ph => (
                  <div key={ph.key} className={`p-4 rounded-xl border-2 text-center ${(fiche[ph.key as keyof FullFiche] as boolean) ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <p className="text-2xl mb-1">{(fiche[ph.key as keyof FullFiche] as boolean) ? '✅' : '❌'}</p>
                    <p className="text-xs font-semibold text-gray-700">{ph.label}</p>
                  </div>
                ))}
              </div>
              {fiche.ph_details && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1">Justification</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{fiche.ph_details}</p>
                </div>
              )}
            </div>
          )}

          {/* Dépenses éligibles selon le fonds */}
          {config?.depensesEligibles && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-3">Dépenses éligibles — {config.nom}</h3>
              <ul className="space-y-1 text-sm">
                {config.depensesEligibles.map((d, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-green-500 flex-shrink-0">✓</span>
                    <span className="text-gray-700">{d}</span>
                  </li>
                ))}
              </ul>
              {config.depensesIneligibles && config.depensesIneligibles.length > 0 && (
                <>
                  <h4 className="font-semibold text-gray-700 mt-4 mb-2">Dépenses inéligibles</h4>
                  <ul className="space-y-1 text-sm">
                    {config.depensesIneligibles.map((d, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-red-500 flex-shrink-0">✗</span>
                        <span className="text-gray-600">{d}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {/* Obligations de publicité */}
          {config?.mentionObligatoire && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
              <h3 className="font-bold text-yellow-800 mb-2">Obligations de publicité et communication</h3>
              {config.logosObligatoires && (
                <p className="text-sm text-yellow-700 mb-2">
                  Logos obligatoires : <strong>{config.logosObligatoires.map(l => l.toUpperCase()).join(' + ')}</strong>
                </p>
              )}
              <div className="bg-yellow-100 rounded-lg p-3 text-sm text-yellow-800 font-mono leading-relaxed">
                {config.mentionObligatoire}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
