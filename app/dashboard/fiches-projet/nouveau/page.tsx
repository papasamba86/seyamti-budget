'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FONDS_CONFIG, calculerTauxApplicable, recommanderFonds, verifierCumul } from '@/lib/reglementation/fonds.config';
import { LABELS_TYPE_STRUCTURE, LABELS_SECTEUR, LABELS_PIECES, type TypeStructure, type NiveauFonds } from '@/lib/reglementation/types';

// ─── Types locaux ──────────────────────────────────────────────────────────────
interface Financement {
  financeur: string;
  fonds_id_ref: string;
  montant: number;
  taux: number;
  type_financement: string;
  confirme: boolean;
}

interface BudgetLigne {
  type_depense: string;
  categorie: string;
  libelle: string;
  montant: number;
  eligible: boolean;
  taux_eligible: number;
}

interface FormData {
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
  projet_date_debut: string;
  projet_date_fin: string;
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
  financements: Financement[];
  budget: BudgetLigne[];
  pieces: Array<{ code_piece: string; libelle: string; statut: string }>;
}

const INIT_FORM: FormData = {
  titre: '', fonds_id: '', statut: 'brouillon', type_structure: '',
  porteur_nom: '', porteur_siret: '', porteur_adresse: '', porteur_cp: '', porteur_ville: '',
  porteur_contact: '', porteur_email: '', porteur_telephone: '',
  projet_titre: '', projet_description: '', projet_objectifs: '',
  projet_territoire: '', projet_localisation: '',
  projet_date_debut: '', projet_date_fin: '',
  cout_total: 0, montant_subvention_demande: 0, taux_subvention: 0,
  is_qpv: false, is_npnru: false, is_domtom: false, is_zone_rurale: false, is_zone_montagne: false,
  ph_egalite_hf: false, ph_non_discrimination: false, ph_developpement_durable: false, ph_details: '',
  taux_indirect: 20,
  financements: [], budget: [], pieces: [],
};

const STEPS = [
  { id: 1, label: 'Fonds & Structure', icon: '🎯' },
  { id: 2, label: 'Porteur de projet', icon: '🏛️' },
  { id: 3, label: 'Description', icon: '📝' },
  { id: 4, label: 'Budget & Financement', icon: '💰' },
  { id: 5, label: 'Conformité', icon: '✅' },
  { id: 6, label: 'Récapitulatif', icon: '📋' },
];

const TYPE_DEPENSE_OPTIONS = [
  'Personnel direct', 'Frais de déplacement', 'Équipements',
  'Formations externalisées', 'Prestations de services',
  'Frais de fonctionnement', 'Communication / publicité',
  'Maîtrise d\'œuvre / Études', 'Travaux',
  'Dépenses participants', 'Autres',
];

// ─── Composant principal ──────────────────────────────────────────────────────
export default function NouvellesFichePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INIT_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const config = form.fonds_id ? FONDS_CONFIG[form.fonds_id] : null;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const territoire = {
    isQPV: form.is_qpv,
    isNPNRU: form.is_npnru,
    isDOMTOM: form.is_domtom,
    isZoneRurale: form.is_zone_rurale,
    isZoneMontagne: form.is_zone_montagne,
  };

  // Taux applicable calculé automatiquement
  const tauxApplicable = form.fonds_id ? calculerTauxApplicable(form.fonds_id, territoire) : 0;

  // Sync taux & montant subvention
  function updateCoutTotal(val: number) {
    set('cout_total', val);
    if (tauxApplicable > 0) {
      const montant = Math.round(val * tauxApplicable / 100);
      set('montant_subvention_demande', montant);
      set('taux_subvention', tauxApplicable);
    }
  }

  function updateMontantSubvention(val: number) {
    set('montant_subvention_demande', val);
    if (form.cout_total > 0) {
      set('taux_subvention', parseFloat(((val / form.cout_total) * 100).toFixed(2)));
    }
  }

  // Auto-remplir les pièces justificatives depuis la config du fonds
  function autoFillPieces() {
    if (!config?.piecesjustificatives) return;
    const pieces = config.piecesjustificatives.map(code => ({
      code_piece: code,
      libelle: LABELS_PIECES[code] ?? code,
      statut: 'requise' as const,
    }));
    set('pieces', pieces);
  }

  // Alertes temps réel
  const alertes: Array<{ msg: string; level: 'error' | 'warning' | 'info' }> = [];
  if (config) {
    if (form.taux_subvention > config.tauxMax) {
      alertes.push({ msg: `Taux demandé (${form.taux_subvention.toFixed(1)}%) dépasse le maximum réglementaire (${config.tauxMax}%).`, level: 'error' });
    }
    if (config.principesHorizontauxObligatoires && (!form.ph_egalite_hf || !form.ph_non_discrimination || !form.ph_developpement_durable)) {
      alertes.push({ msg: 'Les 3 principes horizontaux sont obligatoires pour ce fonds.', level: 'error' });
    }
    if (config.consortiumObligatoire) {
      alertes.push({ msg: `Ce fonds requiert un consortium d\'au moins ${config.nbPaysMinimum ?? 3} pays.`, level: 'warning' });
    }
    if (config.conditionTerritoire && !form.is_qpv && !form.is_zone_rurale && !form.is_domtom) {
      alertes.push({ msg: `Condition territoriale : ${config.conditionTerritoire}`, level: 'info' });
    }
  }

  // Recommandations fonds
  const recommandations = form.type_structure && form.projet_description
    ? recommanderFonds(
        form.type_structure as TypeStructure,
        ['europeen', 'national', 'regional', 'departemental', 'prive'] as NiveauFonds[],
        ['insertion_emploi', 'formation', 'transition_ecologique', 'numerique', 'culture'],
        territoire,
        form.cout_total,
      ).slice(0, 5)
    : [];

  // ── Validation par étape ─────────────────────────────────────────────────────
  function validateStep(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!form.fonds_id) e.fonds_id = 'Sélectionner un fonds';
      if (!form.type_structure) e.type_structure = 'Sélectionner un type de structure';
      if (!form.titre.trim()) e.titre = 'Titre requis';
    }
    if (s === 2) {
      if (!form.porteur_nom.trim()) e.porteur_nom = 'Nom du porteur requis';
    }
    if (s === 3) {
      if (!form.projet_titre.trim()) e.projet_titre = 'Intitulé du projet requis';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    if (step === 4 && config?.piecesjustificatives && form.pieces.length === 0) {
      autoFillPieces();
    }
    setStep(s => Math.min(s + 1, STEPS.length));
  }

  function back() { setStep(s => Math.max(s - 1, 1)); }

  // ── Sauvegarde ───────────────────────────────────────────────────────────────
  async function handleSave(statut = form.statut) {
    if (!validateStep(step)) return;
    setSaving(true);
    try {
      const payload = { ...form, statut };
      const res = await fetch('/api/fiches-projet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        alert('Erreur : ' + (err.error ?? 'Erreur serveur'));
        return;
      }
      const created = await res.json();
      router.push(`/dashboard/fiches-projet/${created.id}`);
    } finally {
      setSaving(false);
    }
  }

  // ── UI STEP 1 — Fonds & Structure ────────────────────────────────────────────
  const Step1 = (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Titre du dossier <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.titre}
          onChange={e => set('titre', e.target.value)}
          placeholder="Ex. : Programme d'insertion par l'activité économique 2025"
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy ${errors.titre ? 'border-red-400' : 'border-gray-200'}`}
        />
        {errors.titre && <p className="text-red-500 text-xs mt-1">{errors.titre}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Type de structure porteuse <span className="text-red-500">*</span>
        </label>
        <select
          value={form.type_structure}
          onChange={e => set('type_structure', e.target.value)}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy ${errors.type_structure ? 'border-red-400' : 'border-gray-200'}`}
        >
          <option value="">— Sélectionner —</option>
          {(Object.entries(LABELS_TYPE_STRUCTURE) as [TypeStructure, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {errors.type_structure && <p className="text-red-500 text-xs mt-1">{errors.type_structure}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Fonds sollicité <span className="text-red-500">*</span>
        </label>
        {errors.fonds_id && <p className="text-red-500 text-xs mb-2">{errors.fonds_id}</p>}

        {/* Fonds groupés par niveau */}
        {(['europeen', 'national', 'regional', 'departemental', 'prive'] as NiveauFonds[]).map(niveau => {
          const niveauFonds = Object.entries(FONDS_CONFIG).filter(([, c]) => c.niveau === niveau);
          if (niveauFonds.length === 0) return null;
          const labels: Record<string, string> = {
            europeen: '🇪🇺 Fonds européens 2021-2027',
            national: '🇫🇷 Fonds nationaux français',
            regional: '🌍 Fonds régionaux',
            departemental: '🏛️ Fonds départementaux',
            prive: '🤝 Fondations & mécénat',
          };
          return (
            <div key={niveau} className="mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{labels[niveau]}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {niveauFonds.map(([id, fonds]) => {
                  const isEligible = !form.type_structure || fonds.porteurEligibles.includes(form.type_structure as TypeStructure);
                  const isSelected = form.fonds_id === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => isEligible && set('fonds_id', id)}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-navy bg-navy/5'
                          : isEligible
                          ? 'border-gray-200 hover:border-navy/40 hover:bg-gray-50'
                          : 'border-gray-100 opacity-40 cursor-not-allowed bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-semibold text-gray-800 leading-tight">{fonds.nom}</span>
                        {isSelected && <span className="text-navy text-sm">✓</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-green-600 font-medium">Taux max {fonds.tauxMax}%</span>
                        {fonds.montantMax && (
                          <span className="text-xs text-gray-400">· max {new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(fonds.montantMax)}€</span>
                        )}
                        {!isEligible && (
                          <span className="text-xs text-red-500 font-medium">· Structure inéligible</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Encart réglementaire du fonds sélectionné */}
      {config && (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
          <p className="font-bold text-blue-800 text-sm mb-2">📋 Réglementation applicable</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500 text-xs">Base légale</span>
              <p className="font-medium text-gray-800">{config.reglementBase}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Gestionnaire</span>
              <p className="font-medium text-gray-800">{config.gestionnaire ?? '—'}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Taux standard</span>
              <p className="font-bold text-navy">{config.tauxStandard ?? config.tauxMax}% → max {config.tauxMax}%</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Programme</span>
              <p className="font-medium text-gray-800">{config.programmeOperationnel ?? '—'}</p>
            </div>
          </div>
          {config.periodeEligibilite && (
            <p className="text-xs text-blue-700 mt-2">
              Période d&apos;éligibilité : {config.periodeEligibilite.debut} → {config.periodeEligibilite.fin}
            </p>
          )}
        </div>
      )}

      {/* Recommandations */}
      {recommandations.length > 0 && !form.fonds_id && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="font-bold text-yellow-800 text-sm mb-2">💡 Fonds recommandés pour votre profil</p>
          <ul className="space-y-1">
            {recommandations.map(r => (
              <li key={r.id} className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => set('fonds_id', r.id)}
                  className="text-sm text-blue-700 hover:underline text-left"
                >
                  {r.nom}
                </button>
                <span className="text-xs font-bold text-green-600">{r.tauxApplicable}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  // ── UI STEP 2 — Porteur ─────────────────────────────────────────────────────
  const Step2 = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nom / Raison sociale <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.porteur_nom}
            onChange={e => set('porteur_nom', e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy ${errors.porteur_nom ? 'border-red-400' : 'border-gray-200'}`}
          />
          {errors.porteur_nom && <p className="text-red-500 text-xs mt-1">{errors.porteur_nom}</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">SIRET</label>
          <input
            type="text"
            value={form.porteur_siret}
            onChange={e => set('porteur_siret', e.target.value.replace(/\D/g, '').slice(0, 14))}
            placeholder="12345678901234"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Contact référent</label>
          <input
            type="text"
            value={form.porteur_contact}
            onChange={e => set('porteur_contact', e.target.value)}
            placeholder="Prénom NOM"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Adresse</label>
          <input
            type="text"
            value={form.porteur_adresse}
            onChange={e => set('porteur_adresse', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Code postal</label>
          <input
            type="text"
            value={form.porteur_cp}
            onChange={e => set('porteur_cp', e.target.value.replace(/\D/g, '').slice(0, 5))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Ville</label>
          <input
            type="text"
            value={form.porteur_ville}
            onChange={e => set('porteur_ville', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={form.porteur_email}
            onChange={e => set('porteur_email', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Téléphone</label>
          <input
            type="tel"
            value={form.porteur_telephone}
            onChange={e => set('porteur_telephone', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
        </div>
      </div>
    </div>
  );

  // ── UI STEP 3 — Description projet ──────────────────────────────────────────
  const Step3 = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Intitulé du projet <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.projet_titre}
          onChange={e => set('projet_titre', e.target.value)}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy ${errors.projet_titre ? 'border-red-400' : 'border-gray-200'}`}
        />
        {errors.projet_titre && <p className="text-red-500 text-xs mt-1">{errors.projet_titre}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Territoire</label>
          <input
            type="text"
            value={form.projet_territoire}
            onChange={e => set('projet_territoire', e.target.value)}
            placeholder="Ex. : Métropole de Lyon, QPV Duchère"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Localisation précise</label>
          <input
            type="text"
            value={form.projet_localisation}
            onChange={e => set('projet_localisation', e.target.value)}
            placeholder="Adresse / lieu"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Date de début</label>
          <input
            type="date"
            value={form.projet_date_debut}
            onChange={e => set('projet_date_debut', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Date de fin</label>
          <input
            type="date"
            value={form.projet_date_fin}
            onChange={e => set('projet_date_fin', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Description du projet
          <span className="ml-2 font-normal text-gray-400 text-xs">({form.projet_description.length}/5000 caractères)</span>
        </label>
        <textarea
          value={form.projet_description}
          onChange={e => set('projet_description', e.target.value)}
          rows={5}
          maxLength={5000}
          placeholder="Décrivez votre projet, son contexte, les bénéficiaires visés, les activités prévues..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy resize-y"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Objectifs et résultats attendus
          <span className="ml-2 font-normal text-gray-400 text-xs">({form.projet_objectifs.length}/5000 caractères)</span>
        </label>
        <textarea
          value={form.projet_objectifs}
          onChange={e => set('projet_objectifs', e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Objectifs SMART, indicateurs de résultat, livrables..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy resize-y"
        />
      </div>

      {/* Caractéristiques territoriales */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Caractéristiques territoriales
          <span className="ml-2 font-normal text-gray-400 text-xs">(impacte les taux de subvention)</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { key: 'is_qpv' as const, label: 'Quartier Prioritaire (QPV)', bonus: config?.bonusQPV },
            { key: 'is_npnru' as const, label: 'Zone NPNRU', bonus: null },
            { key: 'is_domtom' as const, label: 'DOM-TOM / RUP', bonus: config?.bonusDOMTOM },
            { key: 'is_zone_rurale' as const, label: 'Zone rurale', bonus: config?.bonusRural },
            { key: 'is_zone_montagne' as const, label: 'Zone de montagne', bonus: config?.bonusMontagne },
          ].map(item => (
            <label key={item.key} className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${form[item.key] ? 'border-navy bg-navy/5' : 'border-gray-200 hover:border-gray-300'}`}>
              <input
                type="checkbox"
                checked={form[item.key]}
                onChange={e => set(item.key, e.target.checked)}
                className="w-4 h-4 accent-navy"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                {item.bonus && (
                  <span className="block text-xs text-green-600 font-semibold">+{item.bonus}% de bonus</span>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Taux calculé */}
      {config && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4">
          <p className="text-sm font-bold text-green-800">
            Taux de subvention applicable : <span className="text-xl">{tauxApplicable}%</span>
            <span className="ml-2 font-normal text-green-600 text-sm">(max réglementaire {config.tauxMax}%)</span>
          </p>
          {form.cout_total > 0 && (
            <p className="text-sm text-green-700 mt-1">
              Subvention estimée : <strong>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(form.cout_total * tauxApplicable / 100)}</strong>
            </p>
          )}
        </div>
      )}
    </div>
  );

  // ── UI STEP 4 — Budget & Financement ────────────────────────────────────────
  const Step4 = (
    <div className="space-y-6">
      {/* Budget global */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Coût total HT du projet (€)</label>
          <input
            type="number"
            min="0"
            step="100"
            value={form.cout_total || ''}
            onChange={e => updateCoutTotal(parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Subvention demandée (€)
            {config && <span className="text-xs text-gray-400 ml-1">(max {tauxApplicable}%)</span>}
          </label>
          <input
            type="number"
            min="0"
            step="100"
            value={form.montant_subvention_demande || ''}
            onChange={e => updateMontantSubvention(parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Taux (%)</label>
          <div className="flex items-center">
            <input
              type="number"
              min="0"
              max={config?.tauxMax ?? 100}
              step="0.5"
              value={form.taux_subvention || ''}
              onChange={e => {
                const t = parseFloat(e.target.value) || 0;
                set('taux_subvention', t);
                set('montant_subvention_demande', Math.round(form.cout_total * t / 100));
              }}
              className={`w-full border rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:border-navy ${form.taux_subvention > (config?.tauxMax ?? 100) ? 'border-red-400' : 'border-gray-200'}`}
            />
            <span className="border border-l-0 border-gray-200 bg-gray-50 px-3 py-2 text-sm rounded-r-lg">%</span>
          </div>
          {config && form.taux_subvention > config.tauxMax && (
            <p className="text-red-500 text-xs mt-1">Dépasse le max réglementaire ({config.tauxMax}%)</p>
          )}
        </div>
      </div>

      {/* Frais indirects FSE+ */}
      {config?.tauxForfaitIndirect && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm font-bold text-blue-800 mb-2">Taux forfaitaire de dépenses indirectes</p>
          <div className="flex gap-3">
            {config.tauxForfaitIndirect.map(t => (
              <label key={t} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${form.taux_indirect === t ? 'border-blue-600 bg-blue-100' : 'border-blue-200 hover:border-blue-400'}`}>
                <input type="radio" name="taux_indirect" value={t} checked={form.taux_indirect === t} onChange={() => set('taux_indirect', t)} className="accent-blue-600" />
                <span className="font-bold text-blue-800">{t}%</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Sur la base des coûts directs de personnel.
            {form.taux_indirect === 20 && ' Applicable si coût total < 500 000 €/an.'}
          </p>
        </div>
      )}

      {/* Plan de financement */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700">Plan de financement</label>
          <button
            type="button"
            onClick={() => set('financements', [...form.financements, {
              financeur: '', fonds_id_ref: '', montant: 0, taux: 0, type_financement: '', confirme: false,
            }])}
            className="text-xs bg-navy text-white px-3 py-1.5 rounded-lg hover:bg-navy-light transition-colors"
          >
            + Ajouter un financeur
          </button>
        </div>

        {form.financements.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            Aucun financeur ajouté. Cliquez sur &quot;+ Ajouter un financeur&quot;.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Auto-add principal fund */}
            {config && form.fonds_id && !form.financements.find(f => f.fonds_id_ref === form.fonds_id) && (
              <button
                type="button"
                onClick={() => {
                  set('financements', [
                    { financeur: config.nom, fonds_id_ref: form.fonds_id, montant: form.montant_subvention_demande, taux: form.taux_subvention, type_financement: 'subvention', confirme: false },
                    ...form.financements,
                  ]);
                }}
                className="w-full text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors"
              >
                ← Ajouter automatiquement {config.nom}
              </button>
            )}
            {form.financements.map((f, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="col-span-4">
                  <input
                    type="text"
                    placeholder="Financeur"
                    value={f.financeur}
                    onChange={e => {
                      const upd = [...form.financements];
                      upd[i] = { ...upd[i], financeur: e.target.value };
                      set('financements', upd);
                    }}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-navy"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="Type"
                    value={f.type_financement}
                    onChange={e => {
                      const upd = [...form.financements];
                      upd[i] = { ...upd[i], type_financement: e.target.value };
                      set('financements', upd);
                    }}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-navy"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Montant"
                    value={f.montant || ''}
                    onChange={e => {
                      const upd = [...form.financements];
                      upd[i] = { ...upd[i], montant: parseFloat(e.target.value) || 0 };
                      set('financements', upd);
                    }}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-navy"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Taux %"
                    value={f.taux || ''}
                    onChange={e => {
                      const upd = [...form.financements];
                      upd[i] = { ...upd[i], taux: parseFloat(e.target.value) || 0 };
                      set('financements', upd);
                    }}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-navy"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={f.confirme}
                      onChange={e => {
                        const upd = [...form.financements];
                        upd[i] = { ...upd[i], confirme: e.target.checked };
                        set('financements', upd);
                      }}
                      className="w-4 h-4 accent-green-600"
                    />
                    <span className="text-xs text-gray-500">OK</span>
                  </label>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => set('financements', form.financements.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}

            {/* Totaux */}
            <div className="bg-navy/5 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Total plan de financement</span>
              <span className={`font-bold text-sm ${
                Math.abs(form.financements.reduce((s, f) => s + f.montant, 0) - form.cout_total) < 1
                  ? 'text-green-600'
                  : 'text-orange-600'
              }`}>
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(form.financements.reduce((s, f) => s + f.montant, 0))}
                {' '}/{' '}
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(form.cout_total)}
              </span>
            </div>

            {/* Vérification cumul */}
            {form.financements.length >= 2 && form.financements[0]?.fonds_id_ref && form.financements[1]?.fonds_id_ref && (
              (() => {
                const cumul = verifierCumul(form.financements[0].fonds_id_ref, form.financements[1].fonds_id_ref);
                return (
                  <div className={`rounded-xl p-3 text-xs ${
                    cumul.compatible === 'oui' ? 'bg-green-50 border border-green-200 text-green-800'
                    : cumul.compatible === 'conditionnel' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                    : cumul.compatible === 'non' ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-gray-50 border border-gray-200 text-gray-700'
                  }`}>
                    <strong>Règle de cumul :</strong> {cumul.condition}
                    {cumul.reference && <span className="ml-2 opacity-70">({cumul.reference})</span>}
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>

      {/* Détail budget */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700">Budget prévisionnel détaillé</label>
          <button
            type="button"
            onClick={() => set('budget', [...form.budget, {
              type_depense: '', categorie: '', libelle: '', montant: 0, eligible: true, taux_eligible: 100,
            }])}
            className="text-xs bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 transition-colors"
          >
            + Ajouter une ligne
          </button>
        </div>

        {form.budget.length > 0 && (
          <div className="space-y-2">
            {form.budget.map((b, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="col-span-3">
                  <select
                    value={b.type_depense}
                    onChange={e => {
                      const upd = [...form.budget];
                      upd[i] = { ...upd[i], type_depense: e.target.value };
                      set('budget', upd);
                    }}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-navy"
                  >
                    <option value="">Type</option>
                    {TYPE_DEPENSE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    placeholder="Catégorie"
                    value={b.categorie}
                    onChange={e => {
                      const upd = [...form.budget];
                      upd[i] = { ...upd[i], categorie: e.target.value };
                      set('budget', upd);
                    }}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-navy"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    placeholder="Libellé"
                    value={b.libelle}
                    onChange={e => {
                      const upd = [...form.budget];
                      upd[i] = { ...upd[i], libelle: e.target.value };
                      set('budget', upd);
                    }}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-navy"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Montant €"
                    value={b.montant || ''}
                    onChange={e => {
                      const upd = [...form.budget];
                      upd[i] = { ...upd[i], montant: parseFloat(e.target.value) || 0 };
                      set('budget', upd);
                    }}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-navy"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => set('budget', form.budget.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-end text-sm font-bold text-navy">
              Total : {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
                form.budget.reduce((s, b) => s + b.montant, 0)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── UI STEP 5 — Conformité ───────────────────────────────────────────────────
  const Step5 = (
    <div className="space-y-6">
      {/* Alertes réglementaires */}
      {alertes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-gray-700">Alertes réglementaires</p>
          {alertes.map((a, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
              a.level === 'error' ? 'bg-red-50 border-red-200 text-red-800'
              : a.level === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <span className="text-lg flex-shrink-0">
                {a.level === 'error' ? '❌' : a.level === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              <p className="text-sm">{a.msg}</p>
            </div>
          ))}
        </div>
      )}

      {alertes.length === 0 && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-bold text-sm">Conformité réglementaire vérifiée</p>
            <p className="text-xs mt-0.5">Aucune alerte détectée pour ce dossier.</p>
          </div>
        </div>
      )}

      {/* Principes horizontaux (si obligatoires) */}
      {config?.principesHorizontauxObligatoires && (
        <div>
          <p className="text-sm font-bold text-gray-700 mb-3">
            Principes horizontaux obligatoires
            <span className="ml-2 text-xs text-red-500 font-medium">OBLIGATOIRE pour {config.nom}</span>
          </p>
          <div className="space-y-3">
            {[
              { key: 'ph_egalite_hf' as const, label: 'Égalité femmes / hommes', desc: 'Indicateurs de suivi genrés, mention sur supports de communication' },
              { key: 'ph_non_discrimination' as const, label: 'Égalité des chances / Non-discrimination', desc: 'Accessibilité PMR, critères non discriminatoires' },
              { key: 'ph_developpement_durable' as const, label: 'Développement durable', desc: 'Volet environnemental justifié, empreinte carbone estimée' },
            ].map(item => (
              <label key={item.key} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form[item.key] ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="checkbox"
                  checked={form[item.key]}
                  onChange={e => set(item.key, e.target.checked)}
                  className="w-5 h-5 accent-green-600 mt-0.5 flex-shrink-0"
                />
                <div>
                  <p className="font-semibold text-sm text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Justification des principes horizontaux
            </label>
            <textarea
              value={form.ph_details}
              onChange={e => set('ph_details', e.target.value)}
              rows={3}
              placeholder="Décrivez comment le projet intègre les 3 principes horizontaux..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy resize-y"
            />
          </div>
        </div>
      )}

      {/* Pièces justificatives */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-700">
            Pièces justificatives
            {config && <span className="ml-2 text-xs text-gray-400 font-normal">({config.nom})</span>}
          </p>
          {config?.piecesjustificatives && form.pieces.length === 0 && (
            <button
              type="button"
              onClick={autoFillPieces}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Auto-remplir depuis le fonds
            </button>
          )}
        </div>

        {form.pieces.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
            {config?.piecesjustificatives
              ? 'Cliquez sur "Auto-remplir" pour charger les pièces requises pour ce fonds'
              : 'Aucune pièce définie'
            }
          </div>
        ) : (
          <div className="space-y-2">
            {form.pieces.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <select
                  value={p.statut}
                  onChange={e => {
                    const upd = [...form.pieces];
                    upd[i] = { ...upd[i], statut: e.target.value };
                    set('pieces', upd);
                  }}
                  className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-navy"
                >
                  <option value="requise">À fournir</option>
                  <option value="fournie">Fournie</option>
                  <option value="non_applicable">N/A</option>
                </select>
                <span className="flex-1 text-sm text-gray-700">
                  {LABELS_PIECES[p.code_piece] ?? p.libelle}
                </span>
                <span className={`text-lg ${p.statut === 'fournie' ? '✅' : p.statut === 'non_applicable' ? '➖' : '⬜'}`}>
                  {p.statut === 'fournie' ? '✅' : p.statut === 'non_applicable' ? '➖' : '⬜'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Obligations de publicité */}
      {config?.logosObligatoires && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
          <p className="font-bold text-yellow-800 text-sm mb-2">Obligations de publicité</p>
          <p className="text-xs text-yellow-700 mb-2">
            Logos obligatoires : <strong>{config.logosObligatoires.join(', ').toUpperCase()}</strong>
          </p>
          {config.mentionObligatoire && (
            <div className="bg-yellow-100 rounded-lg p-2 text-xs text-yellow-800 font-mono">
              {config.mentionObligatoire}
            </div>
          )}
        </div>
      )}

      {/* Indicateurs FSE+ */}
      {config?.indicateursCommuns && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
          <p className="font-bold text-blue-800 text-sm mb-2">Indicateurs de suivi obligatoires</p>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            {config.indicateursCommuns.map((ind, i) => (
              <li key={i}>{ind}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  // ── UI STEP 6 — Récapitulatif ────────────────────────────────────────────────
  const Step6 = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Fonds</p>
          <p className="font-bold text-navy">{config?.nom ?? form.fonds_id}</p>
          <p className="text-xs text-gray-500 mt-1">{config?.reglementBase}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Porteur</p>
          <p className="font-bold text-gray-800">{form.porteur_nom || '—'}</p>
          <p className="text-xs text-gray-500 mt-1">{LABELS_TYPE_STRUCTURE[form.type_structure as TypeStructure] ?? form.type_structure}</p>
        </div>
        <div className="bg-navy/5 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Coût total</p>
          <p className="font-bold text-xl text-navy">
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(form.cout_total)}
          </p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Subvention demandée</p>
          <p className="font-bold text-xl text-green-700">
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(form.montant_subvention_demande)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {form.taux_subvention.toFixed(1)}% · taux max {config?.tauxMax ?? '—'}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="font-bold text-gray-700">{form.financements.length}</p>
          <p className="text-xs text-gray-500">Financeur(s)</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="font-bold text-gray-700">{form.budget.length}</p>
          <p className="text-xs text-gray-500">Ligne(s) de budget</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="font-bold text-gray-700">{form.pieces.filter(p => p.statut === 'fournie').length}/{form.pieces.length}</p>
          <p className="text-xs text-gray-500">Pièces fournies</p>
        </div>
      </div>

      {alertes.filter(a => a.level === 'error').length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="font-bold text-red-700 text-sm mb-2">⚠️ Erreurs de conformité à corriger</p>
          <ul className="text-xs text-red-700 space-y-1">
            {alertes.filter(a => a.level === 'error').map((a, i) => <li key={i}>• {a.msg}</li>)}
          </ul>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Statut du dossier</label>
        <select
          value={form.statut}
          onChange={e => set('statut', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy"
        >
          <option value="brouillon">Brouillon</option>
          <option value="en_cours">En cours de rédaction</option>
          <option value="soumis">Soumis à l&apos;autorité de gestion</option>
        </select>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleSave('brouillon')}
          disabled={saving}
          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          Enregistrer en brouillon
        </button>
        <button
          type="button"
          onClick={() => handleSave(form.statut)}
          disabled={saving || alertes.filter(a => a.level === 'error').length > 0}
          className="flex-1 bg-navy text-white py-3 rounded-xl font-semibold hover:bg-navy-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Créer le dossier'}
        </button>
      </div>
    </div>
  );

  const STEP_CONTENT = [Step1, Step2, Step3, Step4, Step5, Step6];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Nouvelle fiche projet</h1>
        <p className="text-sm text-gray-500 mt-1">Dossier de demande de subvention — conforme à la réglementation du fonds sélectionné</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <button
              type="button"
              onClick={() => step > s.id && setStep(s.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                step === s.id
                  ? 'bg-navy text-white shadow-md'
                  : step > s.id
                  ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>{step > s.id ? '✓' : s.icon}</span>
              <span className="hidden md:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-4 mx-1 ${step > s.id ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Contenu de l'étape */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
          <span className="text-xl">{STEPS[step - 1].icon}</span>
          {STEPS[step - 1].label}
        </h2>
        {STEP_CONTENT[step - 1]}
      </div>

      {/* Navigation */}
      {step < STEPS.length && (
        <div className="flex justify-between">
          <button
            type="button"
            onClick={back}
            disabled={step === 1}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            ← Précédent
          </button>
          <button
            type="button"
            onClick={next}
            className="px-6 py-2.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-light transition-colors"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
