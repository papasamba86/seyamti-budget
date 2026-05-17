'use client';
import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { formatMontant, formatPourcentage } from '@/lib/utils';

interface Action { id: number; nom: string; statut: string; annee: number; description: string }
interface Emploi { id: number; cotation: number; indice_professionnel: number; libelle: string; salaire_annuel: number }
interface DepenseFonct  { id: number; libelle: string; code_compte: string; montant: number }
interface DepensePersonnel {
  id: number; emploi_id: number; emploi_libelle: string;
  cotation: number; indice_professionnel: number; salaire_annuel: number;
  agent_nom: string; pourcentage_affectation: number; heures: number; montant: number;
}
interface Prestation { id: number; libelle: string; cout_horaire: number; nb_heures: number; montant: number }
interface Ressource  { id: number; financeur: string; montant: number; type_financement: string; date_debut: string | null; date_fin: string | null }

const BADGE: Record<string, string>       = { en_cours: 'badge-green', termine: 'badge-gray', suspendu: 'badge-yellow' };
const STATUT_LABELS: Record<string, string> = { en_cours: 'En cours', termine: 'Terminé', suspendu: 'Suspendu' };

/* ── Inline input ── */
function CellInput({
  defaultValue, onSave, onCancel, type = 'text', align = 'left', min, max,
}: {
  defaultValue: string; onSave: (v: string) => void; onCancel: () => void;
  type?: string; align?: 'left' | 'right'; min?: number; max?: number;
}) {
  const [val, setVal] = useState(defaultValue);
  const done = useRef(false);
  function commit(v: string) { if (done.current) return; done.current = true; onSave(v); }
  return (
    <input
      type={type} value={val} autoFocus
      min={min} max={max}
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

  const [action,    setAction]    = useState<Action | null>(null);
  const [emplois,   setEmplois]   = useState<Emploi[]>([]);
  const [fonct,     setFonct]     = useState<DepenseFonct[]>([]);
  const [personnel, setPersonnel] = useState<DepensePersonnel[]>([]);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [ressources,  setRessources]  = useState<Ressource[]>([]);

  const [editCell, setEditCell] = useState<{ id: number; section: string; field: string } | null>(null);

  const [modalFonct,   setModalFonct]   = useState(false);
  const [modalPersonnel, setModalPersonnel] = useState(false);
  const [modalPrest,   setModalPrest]   = useState(false);
  const [modalRess,    setModalRess]    = useState(false);

  const [formFonct,     setFormFonct]     = useState({ libelle: '', code_compte: '', montant: 0 });
  const [formPersonnel, setFormPersonnel] = useState({ emploi_id: 0, agent_nom: '', pourcentage_affectation: 100 });
  const [formPrest,     setFormPrest]     = useState({ libelle: '', cout_horaire: 0, nb_heures: 0 });
  const [formRess,      setFormRess]      = useState({ financeur: '', montant: 0, type_financement: '', date_debut: '', date_fin: '' });

  const [saving,    setSaving]    = useState(false);
  const [modalErr,  setModalErr]  = useState('');

  /* ── Loaders ── */
  const loadFonct      = useCallback(() => fetch(`/api/depenses-fonctionnement?action_id=${actionId}`).then(r => r.json()).then(setFonct),         [actionId]);
  const loadPersonnel  = useCallback(() => fetch(`/api/depenses?action_id=${actionId}`).then(r => r.json()).then(setPersonnel),                    [actionId]);
  const loadPrestations= useCallback(() => fetch(`/api/prestations?action_id=${actionId}`).then(r => r.json()).then(setPrestations),               [actionId]);
  const loadRessources = useCallback(() => fetch(`/api/ressources?action_id=${actionId}`).then(r => r.json()).then(setRessources),                 [actionId]);

  useEffect(() => {
    if (!actionId) return;
    fetch(`/api/actions/${actionId}`).then(r => r.json()).then(setAction);
    fetch('/api/emplois').then(r => r.json()).then(setEmplois);
    loadFonct(); loadPersonnel(); loadPrestations(); loadRessources();
  }, [actionId, loadFonct, loadPersonnel, loadPrestations, loadRessources]);

  /* ── Inline cell renderers ── */
  function textCell(section: string, rowId: number, field: string, value: string, onSave: (v: string) => void) {
    const active = editCell?.section === section && editCell?.id === rowId && editCell.field === field;
    if (active) {
      return <CellInput defaultValue={value} onSave={v => { setEditCell(null); onSave(v); }} onCancel={() => setEditCell(null)} />;
    }
    return (
      <span onClick={() => setEditCell({ section, id: rowId, field })}
        className="block cursor-text rounded px-1.5 py-0.5 text-sm hover:bg-blue-50 min-h-[1.75rem] transition-colors"
        title="Cliquer pour modifier">
        {value || <span className="text-gray-300 italic">—</span>}
      </span>
    );
  }

  function numCell(section: string, rowId: number, field: string, raw: number, display: string, onSave: (v: string) => void, min?: number, max?: number) {
    const active = editCell?.section === section && editCell?.id === rowId && editCell.field === field;
    if (active) {
      return <CellInput defaultValue={String(raw)} type="number" align="right" min={min} max={max}
        onSave={v => { setEditCell(null); onSave(v); }} onCancel={() => setEditCell(null)} />;
    }
    return (
      <span onClick={() => setEditCell({ section, id: rowId, field })}
        className="block cursor-text rounded px-1.5 py-0.5 text-sm text-right hover:bg-blue-50 min-h-[1.75rem] transition-colors"
        title="Cliquer pour modifier">
        {display}
      </span>
    );
  }

  /* ── Fonctionnement updates ── */
  async function updateFonct(row: DepenseFonct, field: string, rawValue: string) {
    const u = { ...row };
    if (field === 'libelle')     u.libelle     = rawValue;
    if (field === 'code_compte') u.code_compte = rawValue;
    if (field === 'montant')     u.montant     = Math.max(0, parseFloat(rawValue) || 0);
    await fetch('/api/depenses-fonctionnement', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, action_id: actionId, libelle: u.libelle, code_compte: u.code_compte, montant: u.montant }),
    });
    loadFonct();
  }

  /* ── Personnel updates ── */
  async function updatePersonnel(dep: DepensePersonnel, field: string, rawValue: string) {
    const u = { ...dep };
    if (field === 'emploi_id')   u.emploi_id   = parseInt(rawValue) || dep.emploi_id;
    if (field === 'agent_nom')   u.agent_nom   = rawValue;
    if (field === 'pourcentage') u.pourcentage_affectation = Math.min(1, Math.max(0.01, parseFloat(rawValue) / 100 || 0.01));
    if (field === 'heures')      u.heures      = Math.max(0, parseFloat(rawValue) || 0);
    if (field === 'montant')     u.montant     = Math.max(0, parseFloat(rawValue) || 0);
    await fetch('/api/depenses', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, action_id: actionId, emploi_id: u.emploi_id, agent_nom: u.agent_nom, pourcentage_affectation: u.pourcentage_affectation, heures: u.heures, montant: u.montant }),
    });
    loadPersonnel();
  }

  async function updatePrest(p: Prestation, field: string, rawValue: string) {
    const u = { ...p };
    if (field === 'libelle')      u.libelle      = rawValue;
    if (field === 'cout_horaire') u.cout_horaire = Math.max(0, parseFloat(rawValue) || 0);
    if (field === 'nb_heures')    u.nb_heures    = Math.max(0, parseFloat(rawValue) || 0);
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
    if (field === 'date_debut')       u.date_debut       = rawValue || null;
    if (field === 'date_fin')         u.date_fin         = rawValue || null;
    await fetch('/api/ressources', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, action_id: actionId, financeur: u.financeur, montant: u.montant,
        type_financement: u.type_financement, date_debut: u.date_debut, date_fin: u.date_fin }),
    });
    loadRessources();
  }

  /* ── Add handlers ── */
  async function addFonct(e: FormEvent) {
    e.preventDefault(); setSaving(true); setModalErr('');
    if (!formFonct.libelle.trim()) { setModalErr('Libellé requis'); setSaving(false); return; }
    const res = await fetch('/api/depenses-fonctionnement', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_id: actionId, libelle: formFonct.libelle, code_compte: formFonct.code_compte, montant: formFonct.montant }),
    });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setModalErr(data.error ?? 'Erreur'); return; }
    setModalFonct(false); setFormFonct({ libelle: '', code_compte: '', montant: 0 }); loadFonct();
  }

  async function addPersonnel(e: FormEvent) {
    e.preventDefault(); setSaving(true); setModalErr('');
    if (!formPersonnel.emploi_id) { setModalErr('Sélectionnez un emploi repère'); setSaving(false); return; }
    const pct = Math.min(100, Math.max(1, formPersonnel.pourcentage_affectation));
    const res = await fetch('/api/depenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_id: actionId, emploi_id: formPersonnel.emploi_id, agent_nom: formPersonnel.agent_nom, pourcentage_affectation: pct / 100, heures: 0, montant: 0 }),
    });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setModalErr(data.error ?? 'Erreur'); return; }
    setModalPersonnel(false); loadPersonnel();
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
      body: JSON.stringify({
        action_id: actionId, financeur: formRess.financeur, montant: formRess.montant,
        type_financement: formRess.type_financement,
        date_debut: formRess.date_debut || null, date_fin: formRess.date_fin || null,
      }),
    });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setModalErr(data.error ?? 'Erreur'); return; }
    setModalRess(false); setFormRess({ financeur: '', montant: 0, type_financement: '', date_debut: '', date_fin: '' }); loadRessources();
  }

  async function deleteFonct(id: number)    { if (!confirm('Supprimer cette dépense ?'))    return; await fetch(`/api/depenses-fonctionnement?id=${id}`, { method: 'DELETE' }); loadFonct(); }
  async function deletePersonnel(id: number){ if (!confirm('Supprimer cet agent ?'))         return; await fetch(`/api/depenses?id=${id}`,                { method: 'DELETE' }); loadPersonnel(); }
  async function deletePrest(id: number)    { if (!confirm('Supprimer cette prestation ?')) return; await fetch(`/api/prestations?id=${id}`,             { method: 'DELETE' }); loadPrestations(); }
  async function deleteRess(id: number)     { if (!confirm('Supprimer ce financeur ?'))     return; await fetch(`/api/ressources?id=${id}`,              { method: 'DELETE' }); loadRessources(); }

  /* ── Totals ── */
  const totalFonct      = fonct.reduce((s, d) => s + Number(d.montant), 0);
  const totalPersonnel  = personnel.reduce((s, d) => s + Number(d.montant), 0);
  const totalPrest      = prestations.reduce((s, p) => s + Number(p.montant), 0);
  const totalRess       = ressources.reduce((s, r) => s + Number(r.montant), 0);
  const totalCharges    = totalFonct + totalPersonnel + totalPrest;

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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Fonctionnement',  val: totalFonct,     color: 'text-orange-600' },
          { label: 'Personnel',       val: totalPersonnel, color: 'text-purple-600' },
          { label: 'Prestations',     val: totalPrest,     color: 'text-blue-600'   },
          { label: 'Total charges',   val: totalCharges,   color: 'text-red-600'    },
          { label: 'Total ressources',val: totalRess,      color: 'text-green-600'  },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`mt-1 text-sm font-bold ${s.color}`}>{formatMontant(s.val)}</p>
          </div>
        ))}
      </div>

      {/* ═══════════════════ SECTION 1 : DÉPENSES DE FONCTIONNEMENT ═══════════════════ */}
      <section className="space-y-3">
        <SectionTitle
          label="Dépenses de fonctionnement"
          total={totalFonct}
          color="text-orange-600"
          onAdd={() => { setFormFonct({ libelle: '', code_compte: '', montant: 0 }); setModalErr(''); setModalFonct(true); }}
          addLabel="+ Ajouter une dépense"
        />
        <p className="text-xs text-gray-400 -mt-1">Charges de fonctionnement hors personnel (loyer, téléphone, fournitures…)</p>

        {fonct.length === 0
          ? <div className="card p-6 text-center text-sm text-gray-400">Aucune dépense de fonctionnement. Cliquez &quot;+ Ajouter une dépense&quot;.</div>
          : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-20">Code</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Libellé</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-40">Montant</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fonct.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-3 py-1 font-mono text-xs text-gray-500">
                      {textCell('fonct', d.id, 'code_compte', d.code_compte, v => updateFonct(d, 'code_compte', v))}
                    </td>
                    <td className="px-3 py-1 font-medium">
                      {textCell('fonct', d.id, 'libelle', d.libelle, v => updateFonct(d, 'libelle', v))}
                    </td>
                    <td className="px-3 py-1">
                      {numCell('fonct', d.id, 'montant', d.montant, formatMontant(d.montant), v => updateFonct(d, 'montant', v), 0)}
                    </td>
                    <td className="px-3 py-1 text-center">
                      <button onClick={() => deleteFonct(d.id)} className="text-gray-300 hover:text-red-500 text-base leading-none" title="Supprimer">✕</button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-navy/30 bg-orange-50">
                  <td colSpan={2} className="px-3 py-2 text-right text-sm font-semibold text-gray-700">TOTAL FONCTIONNEMENT</td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-orange-700">{formatMontant(totalFonct)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ═══════════════════ SECTION 2 : DÉPENSES DE PERSONNEL ═══════════════════ */}
      <section className="space-y-3">
        <SectionTitle
          label="Dépenses de personnel"
          total={totalPersonnel}
          color="text-purple-600"
          onAdd={() => { setFormPersonnel({ emploi_id: emplois[0]?.id ?? 0, agent_nom: '', pourcentage_affectation: 100 }); setModalErr(''); setModalPersonnel(true); }}
          addLabel="+ Ajouter un agent"
        />

        {personnel.length === 0
          ? <div className="card p-6 text-center text-sm text-gray-400">Aucun agent affecté.</div>
          : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-14">Cot.</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-20">Ind.</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Emploi Repère</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Nom Agent</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-28">% Affect.</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-24">Heures</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-36">Montant</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {personnel.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-3 py-1 text-center text-gray-500">{d.cotation}</td>
                    <td className="px-3 py-1 text-center text-gray-500">{d.indice_professionnel}</td>

                    <td className="px-3 py-1 font-medium">
                      {editCell?.section === 'perso' && editCell.id === d.id && editCell.field === 'emploi_id' ? (
                        <select autoFocus value={String(d.emploi_id)}
                          onChange={async e => { setEditCell(null); await updatePersonnel(d, 'emploi_id', e.target.value); }}
                          onBlur={() => setEditCell(null)}
                          className="w-full rounded border border-navy px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-navy">
                          {emplois.map(em => <option key={em.id} value={String(em.id)}>{em.libelle}</option>)}
                        </select>
                      ) : (
                        <span onClick={() => setEditCell({ section: 'perso', id: d.id, field: 'emploi_id' })}
                          className="block cursor-text rounded px-1.5 py-0.5 hover:bg-blue-50 min-h-[1.75rem]">
                          {d.emploi_libelle}
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-1">{textCell('perso', d.id, 'agent_nom', d.agent_nom, v => updatePersonnel(d, 'agent_nom', v))}</td>
                    <td className="px-3 py-1">
                      {numCell('perso', d.id, 'pourcentage', d.pourcentage_affectation * 100,
                        formatPourcentage(d.pourcentage_affectation), v => updatePersonnel(d, 'pourcentage', v), 1, 100)}
                    </td>
                    <td className="px-3 py-1">
                      {numCell('perso', d.id, 'heures', d.heures, `${Number(d.heures).toFixed(1)} h`, v => updatePersonnel(d, 'heures', v), 0)}
                    </td>
                    <td className="px-3 py-1">
                      {numCell('perso', d.id, 'montant', d.montant, formatMontant(d.montant), v => updatePersonnel(d, 'montant', v), 0)}
                    </td>
                    <td className="px-3 py-1 text-center">
                      <button onClick={() => deletePersonnel(d.id)} className="text-gray-300 hover:text-red-500 text-base leading-none" title="Supprimer">✕</button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-navy/30 bg-purple-50">
                  <td colSpan={6} className="px-3 py-2 text-right text-sm font-semibold text-gray-700">TOTAL PERSONNEL</td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-purple-700">{formatMontant(totalPersonnel)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ═══════════════════ SECTION 3 : PRESTATIONS DE SERVICES ═══════════════════ */}
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
                    <td className="px-3 py-1">{textCell('prest', p.id, 'libelle', p.libelle, v => updatePrest(p, 'libelle', v))}</td>
                    <td className="px-3 py-1">{numCell('prest', p.id, 'cout_horaire', p.cout_horaire, formatMontant(p.cout_horaire), v => updatePrest(p, 'cout_horaire', v), 0)}</td>
                    <td className="px-3 py-1">{numCell('prest', p.id, 'nb_heures', p.nb_heures, `${Number(p.nb_heures).toFixed(1)} h`, v => updatePrest(p, 'nb_heures', v), 0)}</td>
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

      {/* ═══════════════════ SECTION 4 : RESSOURCES ═══════════════════ */}
      <section className="space-y-3">
        <SectionTitle
          label="Ressources"
          total={totalRess}
          color="text-green-600"
          onAdd={() => { setFormRess({ financeur: '', montant: 0, type_financement: '', date_debut: '', date_fin: '' }); setModalErr(''); setModalRess(true); }}
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
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-32">Début convention</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-32">Fin convention</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-36">Montant</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-28">% charges</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ressources.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-1">{textCell('ress', r.id, 'financeur', r.financeur, v => updateRess(r, 'financeur', v))}</td>
                    <td className="px-3 py-1">{textCell('ress', r.id, 'type_financement', r.type_financement, v => updateRess(r, 'type_financement', v))}</td>
                    <td className="px-3 py-1">
                      {numCell('ress', r.id, 'date_debut',
                        0,
                        r.date_debut ? new Date(r.date_debut).toLocaleDateString('fr-FR') : '–',
                        v => updateRess(r, 'date_debut', v))}
                    </td>
                    <td className="px-3 py-1">
                      {numCell('ress', r.id, 'date_fin',
                        0,
                        r.date_fin ? new Date(r.date_fin).toLocaleDateString('fr-FR') : '–',
                        v => updateRess(r, 'date_fin', v))}
                    </td>
                    <td className="px-3 py-1">{numCell('ress', r.id, 'montant', r.montant, formatMontant(r.montant), v => updateRess(r, 'montant', v), 0)}</td>
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

      {/* ─── Modal : Ajouter dépense fonctionnement ─── */}
      <Modal title="Ajouter une dépense de fonctionnement" open={modalFonct} onClose={() => setModalFonct(false)}>
        {modalErr && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{modalErr}</p>}
        <form onSubmit={addFonct} className="space-y-4">
          <div>
            <label className="label">Libellé <span className="text-red-500">*</span></label>
            <input className="input" required maxLength={255} placeholder="ex. Loyer, Téléphone, Fournitures…"
              value={formFonct.libelle} onChange={e => setFormFonct(f => ({ ...f, libelle: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Code compte</label>
              <input className="input" maxLength={10} placeholder="60, 61, 62…"
                value={formFonct.code_compte} onChange={e => setFormFonct(f => ({ ...f, code_compte: e.target.value }))} />
            </div>
            <div>
              <label className="label">Montant (€)</label>
              <input type="number" min={0} step="0.01" className="input"
                value={formFonct.montant} onChange={e => setFormFonct(f => ({ ...f, montant: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalFonct(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Ajout...' : 'Ajouter'}</button>
          </div>
        </form>
      </Modal>

      {/* ─── Modal : Ajouter agent ─── */}
      <Modal title="Ajouter un agent" open={modalPersonnel} onClose={() => setModalPersonnel(false)}>
        {modalErr && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{modalErr}</p>}
        <form onSubmit={addPersonnel} className="space-y-4">
          <div>
            <label className="label">Emploi repère <span className="text-red-500">*</span></label>
            <select className="input" value={formPersonnel.emploi_id}
              onChange={e => setFormPersonnel(f => ({ ...f, emploi_id: parseInt(e.target.value) }))}>
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
                value={formPersonnel.agent_nom} onChange={e => setFormPersonnel(f => ({ ...f, agent_nom: e.target.value }))} />
            </div>
            <div>
              <label className="label">% Affectation (1–100)</label>
              <input type="number" min={1} max={100} step={1} className="input"
                value={formPersonnel.pourcentage_affectation}
                onChange={e => setFormPersonnel(f => ({ ...f, pourcentage_affectation: parseFloat(e.target.value) || 1 }))} />
            </div>
          </div>
          {formPersonnel.emploi_id > 0 && (
            <p className="text-xs text-gray-500">
              Montant calculé : {formatMontant((emplois.find(e => e.id === formPersonnel.emploi_id)?.salaire_annuel ?? 0) * formPersonnel.pourcentage_affectation / 100)}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalPersonnel(false)} className="btn-secondary">Annuler</button>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Début de convention</label>
              <input type="date" className="input"
                value={formRess.date_debut} onChange={e => setFormRess(f => ({ ...f, date_debut: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fin de convention</label>
              <input type="date" className="input"
                value={formRess.date_fin} onChange={e => setFormRess(f => ({ ...f, date_fin: e.target.value }))} />
            </div>
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
