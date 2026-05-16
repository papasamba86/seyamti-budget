'use client';
import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { formatMontant, formatPourcentage } from '@/lib/utils';

interface Action { id: number; nom: string; statut: string; annee: number; description: string }
interface Emploi { id: number; cotation: number; indice_professionnel: number; libelle: string; salaire_annuel: number }
interface Depense {
  id: number; emploi_id: number; emploi_libelle: string;
  cotation: number; indice_professionnel: number; salaire_annuel: number;
  agent_nom: string; pourcentage_affectation: number; heures: number; montant: number;
}
interface Prestation { id: number; libelle: string; cout_horaire: number; nb_heures: number; montant: number }
interface Ressource { id: number; financeur: string; montant: number; type_financement: string }

const BADGE: Record<string, string> = { en_cours: 'badge-green', termine: 'badge-gray', suspendu: 'badge-yellow' };
const STATUT_LABELS: Record<string, string> = { en_cours: 'En cours', termine: 'Terminé', suspendu: 'Suspendu' };

/* ── Inline input component ── */
function CellInput({
  defaultValue, onSave, onCancel, type = 'text', align = 'left',
}: {
  defaultValue: string; onSave: (v: string) => void; onCancel: () => void;
  type?: string; align?: 'left' | 'right';
}) {
  const [val, setVal] = useState(defaultValue);
  const done = useRef(false);

  function commit(v: string) {
    if (done.current) return;
    done.current = true;
    onSave(v);
  }

  return (
    <input
      type={type}
      value={val}
      autoFocus
      min={type === 'number' ? 0 : undefined}
      step={type === 'number' ? 'any' : undefined}
      onChange={e => setVal(e.target.value)}
      onBlur={() => commit(val)}
      onKeyDown={e => {
        if (e.key === 'Enter') commit(val);
        if (e.key === 'Escape') { done.current = true; onCancel(); }
      }}
      className={`w-full rounded border border-navy px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-navy ${align === 'right' ? 'text-right' : ''}`}
    />
  );
}

/* ── Section header ── */
function SectionTitle({ label, total, color, onAdd, addLabel }: {
  label: string; total: number; color: string; onAdd: () => void; addLabel: string;
}) {
  return (
    <div className="flex items-center justify-between border-b-2 border-navy pb-2">
      <div className="flex items-center gap-4">
        <h2 className="text-base font-bold text-navy uppercase tracking-wide">{label}</h2>
        <span className={`text-sm font-semibold ${color}`}>{formatMontant(total)}</span>
      </div>
      <button onClick={onAdd} className="btn-primary py-1 text-xs">{addLabel}</button>
    </div>
  );
}

/* ═══════════════════════════════════════════ MAIN PAGE ════════════════════════════════════════ */
export default function ActionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const actionId = parseInt(id);

  const [action, setAction] = useState<Action | null>(null);
  const [emplois, setEmplois] = useState<Emploi[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [ressources, setRessources] = useState<Ressource[]>([]);

  /* which cell is in edit mode: { id: row id, field: field name } */
  const [editCell, setEditCell] = useState<{ id: number; field: string } | null>(null);

  /* modals for adding */
  const [modalDep, setModalDep] = useState(false);
  const [modalPrest, setModalPrest] = useState(false);
  const [modalRess, setModalRess] = useState(false);

  const [formDep, setFormDep] = useState({ emploi_id: 0, agent_nom: '', pourcentage_affectation: 100 });
  const [formPrest, setFormPrest] = useState({ libelle: '', cout_horaire: 0, nb_heures: 0 });
  const [formRess, setFormRess] = useState({ financeur: '', montant: 0, type_financement: '' });
  const [saving, setSaving] = useState(false);
  const [modalErr, setModalErr] = useState('');

  /* ── Loaders ── */
  const loadDepenses    = useCallback(() => fetch(`/api/depenses?action_id=${actionId}`).then(r => r.json()).then(setDepenses),    [actionId]);
  const loadPrestations = useCallback(() => fetch(`/api/prestations?action_id=${actionId}`).then(r => r.json()).then(setPrestations), [actionId]);
  const loadRessources  = useCallback(() => fetch(`/api/ressources?action_id=${actionId}`).then(r => r.json()).then(setRessources),  [actionId]);

  useEffect(() => {
    if (!actionId) return;
    fetch(`/api/actions/${actionId}`).then(r => r.json()).then(setAction);
    fetch('/api/emplois').then(r => r.json()).then(setEmplois);
    loadDepenses(); loadPrestations(); loadRessources();
  }, [actionId, loadDepenses, loadPrestations, loadRessources]);

  /* ── Inline update helpers ── */
  async function updateDep(dep: Depense, field: string, rawValue: string) {
    const u = { ...dep };
    if (field === 'emploi_id')    u.emploi_id = parseInt(rawValue) || dep.emploi_id;
    if (field === 'agent_nom')    u.agent_nom = rawValue;
    if (field === 'pourcentage')  u.pourcentage_affectation = Math.min(1, Math.max(0, parseFloat(rawValue) / 100 || 0));
    if (field === 'heures')       u.heures  = Math.max(0, parseFloat(rawValue) || 0);
    if (field === 'montant')      u.montant = Math.max(0, parseFloat(rawValue) || 0);

    await fetch('/api/depenses', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, action_id: actionId, emploi_id: u.emploi_id, agent_nom: u.agent_nom, pourcentage_affectation: u.pourcentage_affectation, heures: u.heures, montant: u.montant }),
    });
    loadDepenses();
  }

  async function updatePrest(p: Prestation, field: string, rawValue: string) {
    const u = { ...p };
    if (field === 'libelle')      u.libelle     = rawValue;
    if (field === 'cout_horaire') u.cout_horaire = Math.max(0, parseFloat(rawValue) || 0);
    if (field === 'nb_heures')    u.nb_heures   = Math.max(0, parseFloat(rawValue) || 0);

    await fetch('/api/prestations', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, action_id: actionId, libelle: u.libelle, cout_horaire: u.cout_horaire, nb_heures: u.nb_heures }),
    });
    loadPrestations();
  }

  async function updateRess(r: Ressource, field: string, rawValue: string) {
    const u = { ...r };
    if (field === 'financeur')        u.financeur        = rawValue;
    if (field === 'montant')          u.montant          = Math.max(0, parseFloat(rawValue) || 0);
    if (field === 'type_financement') u.type_financement = rawValue;

    await fetch('/api/ressources', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, action_id: actionId, financeur: u.financeur, montant: u.montant, type_financement: u.type_financement }),
    });
    loadRessources();
  }

  /* ── Cell renderers ── */
  function textCell(rowId: number, field: string, value: string, onSave: (v: string) => void) {
    if (editCell?.id === rowId && editCell.field === field) {
      return <CellInput defaultValue={value} onSave={v => { setEditCell(null); onSave(v); }} onCancel={() => setEditCell(null)} />;
    }
    return (
      <span onClick={() => setEditCell({ id: rowId, field })}
        className="block cursor-text rounded px-1.5 py-0.5 text-sm hover:bg-blue-50 min-h-[1.75rem] transition-colors"
        title="Cliquer pour modifier">
        {value || <span className="text-gray-300 italic">—</span>}
      </span>
    );
  }

  function numCell(rowId: number, field: string, raw: number, display: string, onSave: (v: string) => void) {
    if (editCell?.id === rowId && editCell.field === field) {
      return <CellInput defaultValue={String(raw)} type="number" align="right" onSave={v => { setEditCell(null); onSave(v); }} onCancel={() => setEditCell(null)} />;
    }
    return (
      <span onClick={() => setEditCell({ id: rowId, field })}
        className="block cursor-text rounded px-1.5 py-0.5 text-sm text-right hover:bg-blue-50 min-h-[1.75rem] transition-colors"
        title="Cliquer pour modifier">
        {display}
      </span>
    );
  }

  /* ── Add handlers ── */
  async function addDep(e: FormEvent) {
    e.preventDefault(); setSaving(true); setModalErr('');
    if (!formDep.emploi_id) { setModalErr('Sélectionnez un emploi repère'); setSaving(false); return; }
    const res = await fetch('/api/depenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_id: actionId, emploi_id: formDep.emploi_id, agent_nom: formDep.agent_nom, pourcentage_affectation: formDep.pourcentage_affectation / 100, heures: 0, montant: 0 }),
    });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setModalErr(data.error ?? 'Erreur'); return; }
    setModalDep(false); loadDepenses();
  }

  async function addPrest(e: FormEvent) {
    e.preventDefault(); setSaving(true); setModalErr('');
    const res = await fetch('/api/prestations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_id: actionId, libelle: formPrest.libelle, cout_horaire: formPrest.cout_horaire, nb_heures: formPrest.nb_heures }),
    });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setModalErr(data.error ?? 'Erreur'); return; }
    setModalPrest(false); setFormPrest({ libelle: '', cout_horaire: 0, nb_heures: 0 }); loadPrestations();
  }

  async function addRess(e: FormEvent) {
    e.preventDefault(); setSaving(true); setModalErr('');
    const res = await fetch('/api/ressources', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_id: actionId, financeur: formRess.financeur, montant: formRess.montant, type_financement: formRess.type_financement }),
    });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setModalErr(data.error ?? 'Erreur'); return; }
    setModalRess(false); setFormRess({ financeur: '', montant: 0, type_financement: '' }); loadRessources();
  }

  async function deleteDep(id: number)  { if (!confirm('Supprimer cette dépense ?'))    return; await fetch(`/api/depenses?id=${id}`,    { method: 'DELETE' }); loadDepenses(); }
  async function deletePrest(id: number){ if (!confirm('Supprimer cette prestation ?')) return; await fetch(`/api/prestations?id=${id}`, { method: 'DELETE' }); loadPrestations(); }
  async function deleteRess(id: number) { if (!confirm('Supprimer ce financeur ?'))     return; await fetch(`/api/ressources?id=${id}`, { method: 'DELETE' }); loadRessources(); }

  /* ── Totals ── */
  const totalDep    = depenses.reduce((s, d) => s + Number(d.montant), 0);
  const totalPrest  = prestations.reduce((s, p) => s + Number(p.montant), 0);
  const totalRess   = ressources.reduce((s, r) => s + Number(r.montant), 0);
  const totalCharges = totalDep + totalPrest;

  if (!action) return <div className="flex h-full items-center justify-center"><p className="text-gray-400">Chargement...</p></div>;

  return (
    <div className="p-6 space-y-8">

      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href="/dashboard/actions" className="hover:text-navy">Actions / Projets</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">{action.nom}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{action.nom}</h1>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-sm text-gray-500">Exercice {action.annee}</span>
          <span className={BADGE[action.statut] ?? 'badge-gray'}>{STATUT_LABELS[action.statut] ?? action.statut}</span>
        </div>
        {action.description && <p className="mt-1 text-sm text-gray-500">{action.description}</p>}
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Dépenses personnel',  val: totalDep,    color: 'text-orange-600' },
          { label: 'Prestations services', val: totalPrest,  color: 'text-blue-600'  },
          { label: 'Total charges',        val: totalCharges, color: 'text-red-600'  },
          { label: 'Total ressources',     val: totalRess,   color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`mt-1 text-base font-bold ${s.color}`}>{formatMontant(s.val)}</p>
          </div>
        ))}
      </div>

      {/* ═══════════════════ SECTION DÉPENSES ═══════════════════ */}
      <section className="space-y-3">
        <SectionTitle
          label="Dépenses"
          total={totalDep}
          color="text-orange-600"
          onAdd={() => { setFormDep({ emploi_id: emplois[0]?.id ?? 0, agent_nom: '', pourcentage_affectation: 100 }); setModalErr(''); setModalDep(true); }}
          addLabel="+ Ajouter un agent"
        />

        {depenses.length === 0
          ? <div className="card p-6 text-center text-sm text-gray-400">Aucune dépense de personnel. Cliquez &quot;+ Ajouter un agent&quot;.</div>
          : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-14">Cot.</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-20">Ind. Prof.</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Emploi Repère</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Nom Agent</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-28">% Affectation</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-24">Heures</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-36">Montant</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {depenses.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-3 py-1 text-center text-gray-500">{d.cotation}</td>
                    <td className="px-3 py-1 text-center text-gray-500">{d.indice_professionnel}</td>

                    {/* Emploi – select inline */}
                    <td className="px-3 py-1 font-medium">
                      {editCell?.id === d.id && editCell.field === 'emploi_id' ? (
                        <select
                          autoFocus
                          value={String(d.emploi_id)}
                          onChange={async e => { setEditCell(null); await updateDep(d, 'emploi_id', e.target.value); }}
                          onBlur={() => setEditCell(null)}
                          className="w-full rounded border border-navy px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-navy"
                        >
                          {emplois.map(em => <option key={em.id} value={String(em.id)}>{em.libelle}</option>)}
                        </select>
                      ) : (
                        <span onClick={() => setEditCell({ id: d.id, field: 'emploi_id' })}
                          className="block cursor-text rounded px-1.5 py-0.5 hover:bg-blue-50 min-h-[1.75rem]" title="Cliquer pour modifier">
                          {d.emploi_libelle}
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-1">{textCell(d.id, 'agent_nom', d.agent_nom, v => updateDep(d, 'agent_nom', v))}</td>

                    <td className="px-3 py-1">
                      {numCell(d.id, 'pourcentage', d.pourcentage_affectation * 100,
                        formatPourcentage(d.pourcentage_affectation), v => updateDep(d, 'pourcentage', v))}
                    </td>

                    <td className="px-3 py-1">
                      {numCell(d.id, 'heures', d.heures, `${Number(d.heures).toFixed(1)} h`, v => updateDep(d, 'heures', v))}
                    </td>

                    <td className="px-3 py-1">
                      {numCell(d.id, 'montant', d.montant, formatMontant(d.montant), v => updateDep(d, 'montant', v))}
                    </td>

                    <td className="px-3 py-1 text-center">
                      <button onClick={() => deleteDep(d.id)} className="text-gray-300 hover:text-red-500 text-base leading-none" title="Supprimer">✕</button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-navy/30 bg-orange-50">
                  <td colSpan={6} className="px-3 py-2 text-right text-sm font-semibold text-gray-700">TOTAL DÉPENSES</td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-orange-700">{formatMontant(totalDep)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ═══════════════════ SECTION PRESTATIONS DE SERVICES ═══════════════════ */}
      <section className="space-y-3">
        <SectionTitle
          label="Prestations de services"
          total={totalPrest}
          color="text-blue-600"
          onAdd={() => { setFormPrest({ libelle: '', cout_horaire: 0, nb_heures: 0 }); setModalErr(''); setModalPrest(true); }}
          addLabel="+ Ajouter une prestation"
        />

        {prestations.length === 0
          ? <div className="card p-6 text-center text-sm text-gray-400">Aucune prestation de services.</div>
          : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Libellé</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-36">Coût horaire</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-28">Nb d&apos;heures</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-36">Montant</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prestations.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-1">{textCell(p.id, 'libelle', p.libelle, v => updatePrest(p, 'libelle', v))}</td>
                    <td className="px-3 py-1">{numCell(p.id, 'cout_horaire', p.cout_horaire, formatMontant(p.cout_horaire), v => updatePrest(p, 'cout_horaire', v))}</td>
                    <td className="px-3 py-1">{numCell(p.id, 'nb_heures', p.nb_heures, `${Number(p.nb_heures).toFixed(1)} h`, v => updatePrest(p, 'nb_heures', v))}</td>
                    <td className="px-3 py-1 text-right font-semibold text-gray-700 pr-4">{formatMontant(p.montant)}</td>
                    <td className="px-3 py-1 text-center">
                      <button onClick={() => deletePrest(p.id)} className="text-gray-300 hover:text-red-500 text-base leading-none" title="Supprimer">✕</button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-navy/30 bg-blue-50">
                  <td colSpan={3} className="px-3 py-2 text-right text-sm font-semibold text-gray-700">TOTAL PRESTATIONS</td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-blue-700">{formatMontant(totalPrest)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ═══════════════════ SECTION RESSOURCES ═══════════════════ */}
      <section className="space-y-3">
        <SectionTitle
          label="Ressources"
          total={totalRess}
          color="text-green-600"
          onAdd={() => { setFormRess({ financeur: '', montant: 0, type_financement: '' }); setModalErr(''); setModalRess(true); }}
          addLabel="+ Ajouter un financeur"
        />

        {ressources.length === 0
          ? <div className="card p-6 text-center text-sm text-gray-400">Aucune ressource de financement.</div>
          : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Financeur</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Type de financement</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-36">Montant</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-28">% charges</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ressources.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-1">{textCell(r.id, 'financeur', r.financeur, v => updateRess(r, 'financeur', v))}</td>
                    <td className="px-3 py-1">{textCell(r.id, 'type_financement', r.type_financement, v => updateRess(r, 'type_financement', v))}</td>
                    <td className="px-3 py-1">{numCell(r.id, 'montant', r.montant, formatMontant(r.montant), v => updateRess(r, 'montant', v))}</td>
                    <td className="px-3 py-1 text-right text-gray-500">
                      {totalCharges > 0 ? formatPourcentage(r.montant / totalCharges) : '—'}
                    </td>
                    <td className="px-3 py-1 text-center">
                      <button onClick={() => deleteRess(r.id)} className="text-gray-300 hover:text-red-500 text-base leading-none" title="Supprimer">✕</button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-navy/30 bg-green-50">
                  <td colSpan={2} className="px-3 py-2 text-right text-sm font-semibold text-gray-700">TOTAL RESSOURCES</td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-green-700">{formatMontant(totalRess)}</td>
                  <td className="px-3 py-2 text-right text-xs text-gray-500">
                    {totalCharges > 0 ? formatPourcentage(totalRess / totalCharges) : '—'}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── Modal : Ajouter dépense ─── */}
      <Modal title="Ajouter une dépense de personnel" open={modalDep} onClose={() => setModalDep(false)}>
        {modalErr && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{modalErr}</p>}
        <form onSubmit={addDep} className="space-y-4">
          <div>
            <label className="label">Emploi repère <span className="text-red-500">*</span></label>
            <select className="input" value={formDep.emploi_id}
              onChange={e => setFormDep(f => ({ ...f, emploi_id: parseInt(e.target.value) }))}>
              <option value={0}>— Sélectionner —</option>
              {emplois.map(em => (
                <option key={em.id} value={em.id}>
                  [{em.cotation}] {em.libelle} — {formatMontant(em.salaire_annuel)}/an
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nom de l&apos;agent</label>
              <input className="input" maxLength={255} placeholder="Facultatif"
                value={formDep.agent_nom} onChange={e => setFormDep(f => ({ ...f, agent_nom: e.target.value }))} />
            </div>
            <div>
              <label className="label">% Affectation (0–100)</label>
              <input type="number" min={0} max={100} step={5} className="input"
                value={formDep.pourcentage_affectation}
                onChange={e => setFormDep(f => ({ ...f, pourcentage_affectation: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          {formDep.emploi_id > 0 && (
            <p className="text-xs text-gray-500">
              Montant calculé auto : {formatMontant((emplois.find(e => e.id === formDep.emploi_id)?.salaire_annuel ?? 0) * formDep.pourcentage_affectation / 100)}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalDep(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Ajout...' : 'Ajouter'}</button>
          </div>
        </form>
      </Modal>

      {/* ─── Modal : Ajouter prestation ─── */}
      <Modal title="Ajouter une prestation de services" open={modalPrest} onClose={() => setModalPrest(false)}>
        {modalErr && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{modalErr}</p>}
        <form onSubmit={addPrest} className="space-y-4">
          <div>
            <label className="label">Libellé <span className="text-red-500">*</span></label>
            <input className="input" required maxLength={255}
              value={formPrest.libelle} onChange={e => setFormPrest(f => ({ ...f, libelle: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Coût horaire (€)</label>
              <input type="number" min={0} step="0.01" className="input"
                value={formPrest.cout_horaire} onChange={e => setFormPrest(f => ({ ...f, cout_horaire: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Nombre d&apos;heures</label>
              <input type="number" min={0} step="0.5" className="input"
                value={formPrest.nb_heures} onChange={e => setFormPrest(f => ({ ...f, nb_heures: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <p className="text-xs text-gray-500">Montant = {formatMontant(formPrest.cout_horaire * formPrest.nb_heures)}</p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalPrest(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Ajout...' : 'Ajouter'}</button>
          </div>
        </form>
      </Modal>

      {/* ─── Modal : Ajouter ressource ─── */}
      <Modal title="Ajouter un financeur" open={modalRess} onClose={() => setModalRess(false)}>
        {modalErr && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{modalErr}</p>}
        <form onSubmit={addRess} className="space-y-4">
          <div>
            <label className="label">Nom du financeur <span className="text-red-500">*</span></label>
            <input className="input" required maxLength={255}
              value={formRess.financeur} onChange={e => setFormRess(f => ({ ...f, financeur: e.target.value }))} />
          </div>
          <div>
            <label className="label">Type de financement</label>
            <input className="input" maxLength={100} placeholder="Subvention, Autofinancement…"
              value={formRess.type_financement} onChange={e => setFormRess(f => ({ ...f, type_financement: e.target.value }))} />
          </div>
          <div>
            <label className="label">Montant (€)</label>
            <input type="number" min={0} step="0.01" className="input"
              value={formRess.montant} onChange={e => setFormRess(f => ({ ...f, montant: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalRess(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Ajout...' : 'Ajouter'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
