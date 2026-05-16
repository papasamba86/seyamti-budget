'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { formatMontant, formatPourcentage } from '@/lib/utils';

/* ───────── Types ───────── */
interface Action { id: number; nom: string; statut: string; annee: number; description: string }
interface BudgetLigne { id: number; type_flux: string; code_compte: string; categorie: string; sous_categorie: string; montant: number }
interface Emploi { id: number; cotation: number; indice_professionnel: number; libelle: string; salaire_annuel: number }
interface Depense { id: number; emploi_id: number; emploi_libelle: string; agent_nom: string; pourcentage_affectation: number; heures: number; montant: number }
interface Prestation { id: number; libelle: string; cout_horaire: number; nb_heures: number; montant: number }
interface Ressource { id: number; financeur: string; montant: number; type_financement: string }

const TYPE_FLUX_OPTIONS = [
  { value: 'charge',  label: 'Charge'  },
  { value: 'produit', label: 'Produit' },
  { value: 'contribution_emploi',    label: 'Contribution – Emploi'    },
  { value: 'contribution_ressource', label: 'Contribution – Ressource' },
];
const TABS = ['Budget Prévisionnel', 'Dépenses Personnel', 'Prestations', 'Ressources'];
const BADGE: Record<string, string> = { en_cours: 'badge-green', termine: 'badge-gray', suspendu: 'badge-yellow' };
const STATUT_LABELS: Record<string, string> = { en_cours: 'En cours', termine: 'Terminé', suspendu: 'Suspendu' };

/* ═══════════════════════ COMPONENT ═══════════════════════ */
export default function ActionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const actionId = parseInt(id);

  const [action, setAction]       = useState<Action | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [emplois, setEmplois]     = useState<Emploi[]>([]);

  // Budget Prévisionnel
  const [lignes, setLignes]         = useState<BudgetLigne[]>([]);
  const [modalLigne, setModalLigne] = useState(false);
  const [editLigne, setEditLigne]   = useState<BudgetLigne | null>(null);
  const [formLigne, setFormLigne]   = useState({ type_flux: 'charge', code_compte: '', categorie: '', sous_categorie: '', montant: 0, ordre: 0 });

  // Dépenses
  const [depenses, setDepenses]     = useState<Depense[]>([]);
  const [modalDep, setModalDep]     = useState(false);
  const [editDep, setEditDep]       = useState<Depense | null>(null);
  const [formDep, setFormDep]       = useState({ emploi_id: 0, agent_nom: '', pourcentage_affectation: 1, heures: 0, montant: 0 });

  // Prestations
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [modalPrest, setModalPrest]   = useState(false);
  const [editPrest, setEditPrest]     = useState<Prestation | null>(null);
  const [formPrest, setFormPrest]     = useState({ libelle: '', cout_horaire: 0, nb_heures: 0 });

  // Ressources
  const [ressources, setRessources]   = useState<Ressource[]>([]);
  const [modalRess, setModalRess]     = useState(false);
  const [editRess, setEditRess]       = useState<Ressource | null>(null);
  const [formRess, setFormRess]       = useState({ financeur: '', montant: 0, type_financement: '' });

  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  /* ── Load ── */
  useEffect(() => {
    if (!actionId) return;
    fetch(`/api/actions/${actionId}`).then(r => r.json()).then(setAction);
    fetch('/api/emplois').then(r => r.json()).then(setEmplois);
    loadLignes(); loadDepenses(); loadPrestations(); loadRessources();
  }, [actionId]);

  const loadLignes      = () => fetch(`/api/budget-previsionnel?action_id=${actionId}`).then(r => r.json()).then(setLignes);
  const loadDepenses    = () => fetch(`/api/depenses?action_id=${actionId}`).then(r => r.json()).then(setDepenses);
  const loadPrestations = () => fetch(`/api/prestations?action_id=${actionId}`).then(r => r.json()).then(setPrestations);
  const loadRessources  = () => fetch(`/api/ressources?action_id=${actionId}`).then(r => r.json()).then(setRessources);

  /* ── Budget Prévisionnel CRUD ── */
  function openAddLigne() {
    setEditLigne(null);
    setFormLigne({ type_flux: 'charge', code_compte: '', categorie: '', sous_categorie: '', montant: 0, ordre: 0 });
    setErr(''); setModalLigne(true);
  }
  function openEditLigne(l: BudgetLigne) {
    setEditLigne(l);
    setFormLigne({ type_flux: l.type_flux, code_compte: l.code_compte, categorie: l.categorie, sous_categorie: l.sous_categorie, montant: l.montant, ordre: 0 });
    setErr(''); setModalLigne(true);
  }
  async function saveLigne(e: FormEvent) {
    e.preventDefault(); setSaving(true); setErr('');
    const payload = editLigne
      ? { id: editLigne.id, action_id: actionId, ...formLigne, montant: parseFloat(String(formLigne.montant)) }
      : { action_id: actionId, ...formLigne, montant: parseFloat(String(formLigne.montant)) };
    const res = await fetch('/api/budget-previsionnel', {
      method: editLigne ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setErr(data.error ?? 'Erreur'); return; }
    setModalLigne(false); loadLignes();
  }
  async function deleteLigne(id: number) {
    if (!confirm('Supprimer cette ligne ?')) return;
    await fetch(`/api/budget-previsionnel?id=${id}`, { method: 'DELETE' }); loadLignes();
  }

  /* ── Dépenses CRUD ── */
  function openAddDep() {
    setEditDep(null);
    setFormDep({ emploi_id: emplois[0]?.id ?? 0, agent_nom: '', pourcentage_affectation: 1, heures: 0, montant: 0 });
    setErr(''); setModalDep(true);
  }
  function openEditDep(d: Depense) {
    setEditDep(d);
    setFormDep({ emploi_id: d.emploi_id, agent_nom: d.agent_nom, pourcentage_affectation: d.pourcentage_affectation, heures: d.heures, montant: d.montant });
    setErr(''); setModalDep(true);
  }
  async function saveDep(e: FormEvent) {
    e.preventDefault(); setSaving(true); setErr('');
    const payload = {
      ...(editDep ? { id: editDep.id } : {}),
      action_id: actionId, ...formDep,
      pourcentage_affectation: parseFloat(String(formDep.pourcentage_affectation)),
      heures: parseFloat(String(formDep.heures)),
      montant: parseFloat(String(formDep.montant)),
    };
    const res = await fetch('/api/depenses', {
      method: editDep ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setErr(data.error ?? 'Erreur'); return; }
    setModalDep(false); loadDepenses();
  }
  async function deleteDep(id: number) {
    if (!confirm('Supprimer ?')) return;
    await fetch(`/api/depenses?id=${id}`, { method: 'DELETE' }); loadDepenses();
  }

  /* ── Prestations CRUD ── */
  function openAddPrest() {
    setEditPrest(null);
    setFormPrest({ libelle: '', cout_horaire: 0, nb_heures: 0 });
    setErr(''); setModalPrest(true);
  }
  function openEditPrest(p: Prestation) {
    setEditPrest(p);
    setFormPrest({ libelle: p.libelle, cout_horaire: p.cout_horaire, nb_heures: p.nb_heures });
    setErr(''); setModalPrest(true);
  }
  async function savePrest(e: FormEvent) {
    e.preventDefault(); setSaving(true); setErr('');
    const payload = {
      ...(editPrest ? { id: editPrest.id } : {}),
      action_id: actionId, ...formPrest,
      cout_horaire: parseFloat(String(formPrest.cout_horaire)),
      nb_heures:    parseFloat(String(formPrest.nb_heures)),
    };
    const res = await fetch('/api/prestations', {
      method: editPrest ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setErr(data.error ?? 'Erreur'); return; }
    setModalPrest(false); loadPrestations();
  }
  async function deletePrest(id: number) {
    if (!confirm('Supprimer ?')) return;
    await fetch(`/api/prestations?id=${id}`, { method: 'DELETE' }); loadPrestations();
  }

  /* ── Ressources CRUD ── */
  function openAddRess() {
    setEditRess(null);
    setFormRess({ financeur: '', montant: 0, type_financement: '' });
    setErr(''); setModalRess(true);
  }
  function openEditRess(r: Ressource) {
    setEditRess(r);
    setFormRess({ financeur: r.financeur, montant: r.montant, type_financement: r.type_financement });
    setErr(''); setModalRess(true);
  }
  async function saveRess(e: FormEvent) {
    e.preventDefault(); setSaving(true); setErr('');
    const payload = {
      ...(editRess ? { id: editRess.id } : {}),
      action_id: actionId, ...formRess,
      montant: parseFloat(String(formRess.montant)),
    };
    const res = await fetch('/api/ressources', {
      method: editRess ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setErr(data.error ?? 'Erreur'); return; }
    setModalRess(false); loadRessources();
  }
  async function deleteRess(id: number) {
    if (!confirm('Supprimer ?')) return;
    await fetch(`/api/ressources?id=${id}`, { method: 'DELETE' }); loadRessources();
  }

  /* ── Computed ── */
  const totalCharges     = lignes.filter(l => l.type_flux === 'charge').reduce((s, l) => s + l.montant, 0);
  const totalProduits    = lignes.filter(l => l.type_flux === 'produit').reduce((s, l) => s + l.montant, 0);
  const totalDepenses    = depenses.reduce((s, d) => s + d.montant, 0);
  const totalPrestations = prestations.reduce((s, p) => s + p.montant, 0);
  const totalRessources  = ressources.reduce((s, r) => s + r.montant, 0);

  if (!action) return <div className="flex h-full items-center justify-center"><p className="text-gray-400">Chargement...</p></div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/dashboard/actions" className="hover:text-navy">Actions</Link>
            <span>/</span>
            <span>{action.nom}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{action.nom}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-gray-500">Exercice {action.annee}</span>
            <span className={BADGE[action.statut] ?? 'badge-gray'}>
              {STATUT_LABELS[action.statut] ?? action.statut}
            </span>
          </div>
        </div>
      </div>

      {/* Résumé financier */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Charges prévis.',  val: totalCharges,               color: 'text-red-600' },
          { label: 'Produits prévis.', val: totalProduits,              color: 'text-green-600' },
          { label: 'Dépenses person.', val: totalDepenses,              color: 'text-orange-600' },
          { label: 'Ressources',       val: totalRessources,            color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`mt-1 text-lg font-bold ${s.color}`}>{formatMontant(s.val)}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === i ? 'border-navy text-navy' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* ═══ TAB 0: Budget Prévisionnel ═══ */}
      {activeTab === 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4 text-sm">
              <span className="text-red-600 font-semibold">Charges: {formatMontant(totalCharges)}</span>
              <span className="text-green-600 font-semibold">Produits: {formatMontant(totalProduits)}</span>
              <span className={`font-bold ${totalProduits - totalCharges >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                Solde: {formatMontant(totalProduits - totalCharges)}
              </span>
            </div>
            <button onClick={openAddLigne} className="btn-primary">+ Ajouter</button>
          </div>
          {lignes.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">Aucune ligne. Cliquez sur &quot;+ Ajouter&quot;.</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Type', 'Code', 'Catégorie', 'Sous-catégorie', 'Montant', ''].map(h => (
                      <th key={h} className="table-head px-4 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lignes.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <span className={l.type_flux === 'charge' ? 'badge-red' : l.type_flux === 'produit' ? 'badge-green' : 'badge-gray'}>
                          {TYPE_FLUX_OPTIONS.find(o => o.value === l.type_flux)?.label ?? l.type_flux}
                        </span>
                      </td>
                      <td className="table-cell font-mono text-xs text-gray-500">{l.code_compte || '–'}</td>
                      <td className="table-cell font-medium">{l.categorie}</td>
                      <td className="table-cell text-gray-500">{l.sous_categorie || '–'}</td>
                      <td className="table-cell text-right font-semibold">{formatMontant(l.montant)}</td>
                      <td className="table-cell">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openEditLigne(l)} className="text-xs text-navy hover:underline">Modifier</button>
                          <button onClick={() => deleteLigne(l.id)} className="text-xs text-red-500 hover:underline">Suppr.</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 1: Dépenses Personnel ═══ */}
      {activeTab === 1 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold text-gray-700">Total: {formatMontant(totalDepenses)}</p>
            <button onClick={openAddDep} className="btn-primary">+ Ajouter un agent</button>
          </div>
          {depenses.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">Aucune dépense de personnel.</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Emploi', 'Agent', 'Affectation', 'Heures', 'Montant', ''].map(h => (
                      <th key={h} className="table-head px-4 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {depenses.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{d.emploi_libelle}</td>
                      <td className="table-cell">{d.agent_nom || '–'}</td>
                      <td className="table-cell">{formatPourcentage(d.pourcentage_affectation)}</td>
                      <td className="table-cell text-right">{d.heures.toFixed(1)} h</td>
                      <td className="table-cell text-right font-semibold">{formatMontant(d.montant)}</td>
                      <td className="table-cell">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openEditDep(d)} className="text-xs text-navy hover:underline">Modifier</button>
                          <button onClick={() => deleteDep(d.id)} className="text-xs text-red-500 hover:underline">Suppr.</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 2: Prestations ═══ */}
      {activeTab === 2 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold text-gray-700">Total: {formatMontant(totalPrestations)}</p>
            <button onClick={openAddPrest} className="btn-primary">+ Ajouter une prestation</button>
          </div>
          {prestations.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">Aucune prestation de services.</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Libellé', 'Coût horaire', 'Nb heures', 'Montant', ''].map(h => (
                      <th key={h} className="table-head px-4 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {prestations.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{p.libelle}</td>
                      <td className="table-cell text-right">{formatMontant(p.cout_horaire)}</td>
                      <td className="table-cell text-right">{p.nb_heures} h</td>
                      <td className="table-cell text-right font-semibold">{formatMontant(p.montant)}</td>
                      <td className="table-cell">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openEditPrest(p)} className="text-xs text-navy hover:underline">Modifier</button>
                          <button onClick={() => deletePrest(p.id)} className="text-xs text-red-500 hover:underline">Suppr.</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 3: Ressources ═══ */}
      {activeTab === 3 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-700">
              <span className="font-semibold">Total financements: {formatMontant(totalRessources)}</span>
              {totalCharges > 0 && (
                <span className="ml-3 text-gray-500">
                  ({formatPourcentage(totalRessources / totalCharges)} des charges)
                </span>
              )}
            </div>
            <button onClick={openAddRess} className="btn-primary">+ Ajouter un financeur</button>
          </div>
          {ressources.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">Aucune ressource de financement.</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Financeur', 'Type', 'Montant', '% des charges', ''].map(h => (
                      <th key={h} className="table-head px-4 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ressources.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{r.financeur}</td>
                      <td className="table-cell text-gray-500">{r.type_financement || '–'}</td>
                      <td className="table-cell text-right font-semibold">{formatMontant(r.montant)}</td>
                      <td className="table-cell text-right">
                        {totalCharges > 0 ? formatPourcentage(r.montant / totalCharges) : '–'}
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openEditRess(r)} className="text-xs text-navy hover:underline">Modifier</button>
                          <button onClick={() => deleteRess(r.id)} className="text-xs text-red-500 hover:underline">Suppr.</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ Modal Budget Prévisionnel ═══ */}
      <Modal title={editLigne ? 'Modifier la ligne' : 'Nouvelle ligne budgétaire'} open={modalLigne} onClose={() => setModalLigne(false)}>
        {err && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</p>}
        <form onSubmit={saveLigne} className="space-y-4">
          <div>
            <label className="label">Type de flux</label>
            <select className="input" value={formLigne.type_flux} onChange={e => setFormLigne(f => ({ ...f, type_flux: e.target.value }))}>
              {TYPE_FLUX_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Code compte</label>
              <input className="input" maxLength={10} placeholder="60, 61…"
                value={formLigne.code_compte} onChange={e => setFormLigne(f => ({ ...f, code_compte: e.target.value }))} />
            </div>
            <div>
              <label className="label">Montant (€)</label>
              <input type="number" min={0} step="0.01" className="input"
                value={formLigne.montant} onChange={e => setFormLigne(f => ({ ...f, montant: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div>
            <label className="label">Catégorie <span className="text-red-500">*</span></label>
            <input className="input" required maxLength={255}
              value={formLigne.categorie} onChange={e => setFormLigne(f => ({ ...f, categorie: e.target.value }))} />
          </div>
          <div>
            <label className="label">Sous-catégorie</label>
            <input className="input" maxLength={255}
              value={formLigne.sous_categorie} onChange={e => setFormLigne(f => ({ ...f, sous_categorie: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalLigne(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Enreg...' : 'Enregistrer'}</button>
          </div>
        </form>
      </Modal>

      {/* ═══ Modal Dépenses ═══ */}
      <Modal title={editDep ? 'Modifier la dépense' : 'Nouvelle dépense de personnel'} open={modalDep} onClose={() => setModalDep(false)}>
        {err && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</p>}
        <form onSubmit={saveDep} className="space-y-4">
          <div>
            <label className="label">Emploi repère <span className="text-red-500">*</span></label>
            <select className="input" value={formDep.emploi_id}
              onChange={e => setFormDep(f => ({ ...f, emploi_id: parseInt(e.target.value) }))}>
              <option value={0}>-- Sélectionner --</option>
              {emplois.map(em => (
                <option key={em.id} value={em.id}>
                  {em.libelle} (Ind. {em.indice_professionnel})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Nom de l&apos;agent</label>
            <input className="input" maxLength={255}
              value={formDep.agent_nom} onChange={e => setFormDep(f => ({ ...f, agent_nom: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">% Affectation (0-1)</label>
              <input type="number" min={0} max={1} step={0.05} className="input"
                value={formDep.pourcentage_affectation}
                onChange={e => setFormDep(f => ({ ...f, pourcentage_affectation: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Heures (0 = calculé)</label>
              <input type="number" min={0} step={0.5} className="input"
                value={formDep.heures}
                onChange={e => setFormDep(f => ({ ...f, heures: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div>
            <label className="label">Montant € (0 = calculé auto)</label>
            <input type="number" min={0} step="0.01" className="input"
              value={formDep.montant}
              onChange={e => setFormDep(f => ({ ...f, montant: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalDep(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Enreg...' : 'Enregistrer'}</button>
          </div>
        </form>
      </Modal>

      {/* ═══ Modal Prestations ═══ */}
      <Modal title={editPrest ? 'Modifier la prestation' : 'Nouvelle prestation'} open={modalPrest} onClose={() => setModalPrest(false)}>
        {err && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</p>}
        <form onSubmit={savePrest} className="space-y-4">
          <div>
            <label className="label">Libellé <span className="text-red-500">*</span></label>
            <input className="input" required maxLength={255}
              value={formPrest.libelle} onChange={e => setFormPrest(f => ({ ...f, libelle: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Coût horaire (€)</label>
              <input type="number" min={0} step="0.01" className="input"
                value={formPrest.cout_horaire}
                onChange={e => setFormPrest(f => ({ ...f, cout_horaire: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Nombre d&apos;heures</label>
              <input type="number" min={0} step="0.5" className="input"
                value={formPrest.nb_heures}
                onChange={e => setFormPrest(f => ({ ...f, nb_heures: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <p className="text-xs text-gray-500">Montant = {formatMontant(formPrest.cout_horaire * formPrest.nb_heures)}</p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalPrest(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Enreg...' : 'Enregistrer'}</button>
          </div>
        </form>
      </Modal>

      {/* ═══ Modal Ressources ═══ */}
      <Modal title={editRess ? 'Modifier la ressource' : 'Nouveau financeur'} open={modalRess} onClose={() => setModalRess(false)}>
        {err && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</p>}
        <form onSubmit={saveRess} className="space-y-4">
          <div>
            <label className="label">Nom du financeur <span className="text-red-500">*</span></label>
            <input className="input" required maxLength={255}
              value={formRess.financeur} onChange={e => setFormRess(f => ({ ...f, financeur: e.target.value }))} />
          </div>
          <div>
            <label className="label">Type de financement</label>
            <input className="input" maxLength={100} placeholder="Subvention, Autofinancement…"
              value={formRess.type_financement}
              onChange={e => setFormRess(f => ({ ...f, type_financement: e.target.value }))} />
          </div>
          <div>
            <label className="label">Montant (€)</label>
            <input type="number" min={0} step="0.01" className="input"
              value={formRess.montant}
              onChange={e => setFormRess(f => ({ ...f, montant: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalRess(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Enreg...' : 'Enregistrer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
