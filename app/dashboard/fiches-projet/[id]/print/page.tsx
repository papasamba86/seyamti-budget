import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import { FONDS_CONFIG } from '@/lib/reglementation/fonds.config';
import { LABELS_TYPE_STRUCTURE, LABELS_PIECES } from '@/lib/reglementation/types';

type Props = { params: { id: string } };

function formatEur(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR');
}

export default async function PrintFichePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const sql = getDb();
  const rows = await sql`
    SELECT fp.*, u.nom || ' ' || u.prenom AS created_by_name
    FROM fiches_projet fp
    LEFT JOIN users u ON fp.created_by = u.id
    WHERE fp.id = ${id}`;

  if (rows.length === 0) notFound();
  const fiche = rows[0] as Record<string, unknown>;

  if (session.user.role !== 'admin' && String(fiche.created_by) !== session.user.id) {
    redirect('/dashboard/fiches-projet');
  }

  const [financements, budget, pieces] = await Promise.all([
    sql`SELECT * FROM fiche_projet_financements WHERE fiche_id = ${id} ORDER BY id`,
    sql`SELECT * FROM fiche_projet_budget        WHERE fiche_id = ${id} ORDER BY id`,
    sql`SELECT * FROM fiche_projet_pieces        WHERE fiche_id = ${id} ORDER BY id`,
  ]);

  const config = FONDS_CONFIG[fiche.fonds_id as string];
  const totalBudget = (budget as Array<Record<string, unknown>>).reduce((s, b) => s + Number(b.montant ?? 0), 0);
  const totalFinancement = (financements as Array<Record<string, unknown>>).reduce((s, f) => s + Number(f.montant ?? 0), 0);

  // Typed accessors to avoid TS "unknown" JSX errors
  const isQPV = Boolean(fiche.is_qpv);
  const isDOMTOM = Boolean(fiche.is_domtom);
  const isNPNRU = Boolean(fiche.is_npnru);
  const isZoneRurale = Boolean(fiche.is_zone_rurale);
  const isZoneMontagne = Boolean(fiche.is_zone_montagne);
  const phEgaliteHF = Boolean(fiche.ph_egalite_hf);
  const phNonDiscrimination = Boolean(fiche.ph_non_discrimination);
  const phDeveloppementDurable = Boolean(fiche.ph_developpement_durable);
  const coutTotal = Number(fiche.cout_total ?? 0);
  const montantSubvention = Number(fiche.montant_subvention_demande ?? 0);
  const tauxSubvention = Number(fiche.taux_subvention ?? 0);
  const tauxIndirect = Number(fiche.taux_indirect ?? 20);

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <title>Dossier de demande — {String(fiche.titre)}</title>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Inter, Arial, sans-serif; font-size: 11pt; color: #1a202c; background: #fff; }
          @page { size: A4; margin: 20mm 15mm; }
          @media print { .no-print { display: none !important; } }
          .page-break { page-break-before: always; }

          /* Header */
          .cover { text-align: center; padding: 40px 0 30px; border-bottom: 3px solid #1e3a5f; margin-bottom: 30px; }
          .cover-badge { display: inline-block; background: #1e3a5f; color: #fff; padding: 4px 16px; border-radius: 20px; font-size: 9pt; font-weight: 600; margin-bottom: 12px; }
          .cover h1 { font-size: 22pt; font-weight: 700; color: #1e3a5f; line-height: 1.3; margin-bottom: 10px; }
          .cover h2 { font-size: 14pt; color: #c9a227; font-weight: 600; margin-bottom: 20px; }
          .cover-meta { display: flex; justify-content: center; gap: 30px; font-size: 10pt; color: #4a5568; }

          /* Sections */
          .section { margin-bottom: 24px; }
          .section-title {
            font-size: 12pt; font-weight: 700; color: #1e3a5f;
            background: #eef2ff; border-left: 4px solid #1e3a5f;
            padding: 8px 12px; margin-bottom: 12px;
          }
          .sub-title { font-size: 10pt; font-weight: 600; color: #2d3748; margin: 10px 0 6px; }

          /* Grid */
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .field { margin-bottom: 8px; }
          .field label { display: block; font-size: 8.5pt; font-weight: 600; color: #718096; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
          .field p { font-size: 10pt; color: #2d3748; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; min-height: 20px; }
          .field-full { grid-column: 1 / -1; }

          /* Tables */
          table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 12px; }
          th { background: #2d3748; color: #fff; padding: 7px 10px; text-align: left; font-weight: 600; }
          td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) td { background: #f7fafc; }
          .total-row td { font-weight: 700; background: #ebf8ff; border-top: 2px solid #1e3a5f; }
          .right { text-align: right; }

          /* Alertes & Encarts */
          .encart { background: #fffbeb; border: 1px solid #f6e05e; border-radius: 6px; padding: 12px 14px; margin-bottom: 12px; }
          .encart-blue { background: #ebf8ff; border-color: #63b3ed; }
          .encart-red { background: #fff5f5; border-color: #fc8181; }
          .encart-green { background: #f0fff4; border-color: #68d391; }
          .encart-title { font-weight: 700; font-size: 10pt; margin-bottom: 6px; }

          /* Badges */
          .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 8pt; font-weight: 600; }
          .badge-green { background: #c6f6d5; color: #276749; }
          .badge-orange { background: #fefcbf; color: #7b341e; }
          .badge-red { background: #fed7d7; color: #9b2c2c; }
          .badge-blue { background: #bee3f8; color: #2a4365; }

          /* Pièces */
          .piece-list { list-style: none; }
          .piece-list li { display: flex; align-items: baseline; gap: 8px; padding: 5px 0; border-bottom: 1px solid #f0f0f0; font-size: 9.5pt; }
          .piece-list li::before { content: '☐'; font-size: 13pt; color: #4a5568; flex-shrink: 0; }
          .piece-list li.fournie::before { content: '☑'; color: #276749; }

          /* Principes horizontaux */
          .ph-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
          .ph-item { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; }
          .ph-item.ok { border-color: #68d391; background: #f0fff4; }
          .ph-item .ph-icon { font-size: 20pt; margin-bottom: 4px; }
          .ph-item p { font-size: 8.5pt; font-weight: 600; }

          /* Logos zone */
          .logos-zone { display: flex; gap: 16px; align-items: center; justify-content: center; padding: 14px; border: 2px dashed #c9a227; border-radius: 8px; margin-top: 12px; }
          .logo-placeholder { border: 1px solid #ccc; border-radius: 4px; padding: 6px 12px; font-size: 8pt; font-weight: 700; color: #4a5568; }

          /* Footer */
          .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #718096; }
          .print-btn { position: fixed; top: 20px; right: 20px; background: #1e3a5f; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 11pt; font-weight: 600; z-index: 999; }

          /* Mention légale */
          .mention-legale { background: #1e3a5f; color: #fff; padding: 14px 16px; border-radius: 6px; font-size: 9pt; line-height: 1.5; margin-top: 16px; }
        `}</style>
      </head>
      <body>
        <button className="print-btn no-print" onClick={() => window.print()}>
          Imprimer / PDF
        </button>

        {/* PAGE DE COUVERTURE */}
        <div className="cover">
          <div className="cover-badge">{config?.niveau?.toUpperCase() ?? 'SUBVENTION'}</div>
          <h1>DOSSIER DE DEMANDE DE SUBVENTION</h1>
          <h2>{config?.nom ?? String(fiche.fonds_id)}</h2>
          <div className="cover-meta">
            <span>Référence : FP-{String(fiche.id).padStart(4, '0')}</span>
            <span>Date : {new Date().toLocaleDateString('fr-FR')}</span>
            <span>Statut : {String(fiche.statut).replace('_', ' ').toUpperCase()}</span>
          </div>
        </div>

        {/* ENCART RÉGLEMENTAIRE */}
        {config && (
          <div className="encart encart-blue section">
            <div className="encart-title">RÉGLEMENTATION APPLICABLE</div>
            <div className="grid-2">
              <div>
                <strong>Base légale :</strong> {config.reglementBase}<br />
                {config.programmeOperationnel && (
                  <><strong>Programme :</strong> {config.programmeOperationnel}<br /></>
                )}
                <strong>Gestionnaire :</strong> {config.gestionnaire ?? '—'}
              </div>
              <div>
                <strong>Taux maximum :</strong> {config.tauxMax}%<br />
                <strong>Taux standard :</strong> {config.tauxStandard ?? config.tauxMax}%
                {isQPV && config.bonusQPV && (
                  <span className="badge badge-orange" style={{marginLeft:8}}>+{config.bonusQPV}% QPV</span>
                )}
                {isDOMTOM && config.bonusDOMTOM && (
                  <span className="badge badge-orange" style={{marginLeft:8}}>+{config.bonusDOMTOM}% DOM-TOM</span>
                )}<br />
                {config.periodeEligibilite && (
                  <><strong>Période :</strong> {config.periodeEligibilite.debut} → {config.periodeEligibilite.fin}</>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PORTEUR */}
        <div className="section">
          <div className="section-title">1. IDENTIFICATION DU PORTEUR DE PROJET</div>
          <div className="grid-2">
            <div className="field">
              <label>Nom / Raison sociale</label>
              <p>{String(fiche.porteur_nom || '—')}</p>
            </div>
            <div className="field">
              <label>SIRET</label>
              <p>{String(fiche.porteur_siret || '—')}</p>
            </div>
            <div className="field">
              <label>Type de structure</label>
              <p>{LABELS_TYPE_STRUCTURE[fiche.type_structure as keyof typeof LABELS_TYPE_STRUCTURE] ?? String(fiche.type_structure)}</p>
            </div>
            <div className="field">
              <label>Contact référent</label>
              <p>{String(fiche.porteur_contact || '—')}</p>
            </div>
            <div className="field field-full">
              <label>Adresse</label>
              <p>{[fiche.porteur_adresse, fiche.porteur_cp, fiche.porteur_ville].filter(Boolean).join(', ') || '—'}</p>
            </div>
            <div className="field">
              <label>Email</label>
              <p>{String(fiche.porteur_email || '—')}</p>
            </div>
            <div className="field">
              <label>Téléphone</label>
              <p>{String(fiche.porteur_telephone || '—')}</p>
            </div>
          </div>
        </div>

        {/* PROJET */}
        <div className="section">
          <div className="section-title">2. PRÉSENTATION DU PROJET</div>
          <div className="grid-2">
            <div className="field field-full">
              <label>Intitulé du projet</label>
              <p>{String(fiche.projet_titre || '—')}</p>
            </div>
            <div className="field">
              <label>Territoire de réalisation</label>
              <p>{String(fiche.projet_territoire || '—')}</p>
            </div>
            <div className="field">
              <label>Localisation précise</label>
              <p>{String(fiche.projet_localisation || '—')}</p>
            </div>
            <div className="field">
              <label>Date de début</label>
              <p>{formatDate(fiche.projet_date_debut as string)}</p>
            </div>
            <div className="field">
              <label>Date de fin</label>
              <p>{formatDate(fiche.projet_date_fin as string)}</p>
            </div>
          </div>

          {/* Caractéristiques territoriales */}
          <div className="sub-title">Caractéristiques territoriales</div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            {isQPV && <span className="badge badge-orange">Quartier Prioritaire (QPV)</span>}
            {isNPNRU && <span className="badge badge-orange">NPNRU</span>}
            {isDOMTOM && <span className="badge badge-blue">DOM-TOM / RUP</span>}
            {isZoneRurale && <span className="badge badge-green">Zone rurale</span>}
            {isZoneMontagne && <span className="badge badge-blue">Zone de montagne</span>}
            {!isQPV && !isNPNRU && !isDOMTOM && !isZoneRurale && !isZoneMontagne && (
              <span className="badge" style={{background:'#e2e8f0', color:'#4a5568'}}>Zone standard</span>
            )}
          </div>

          <div className="sub-title" style={{marginTop:14}}>Description du projet</div>
          <p style={{fontSize:'10pt', lineHeight:1.6, color:'#2d3748', whiteSpace:'pre-wrap'}}>{String(fiche.projet_description || '—')}</p>

          <div className="sub-title" style={{marginTop:12}}>Objectifs et résultats attendus</div>
          <p style={{fontSize:'10pt', lineHeight:1.6, color:'#2d3748', whiteSpace:'pre-wrap'}}>{String(fiche.projet_objectifs || '—')}</p>
        </div>

        {/* PRINCIPES HORIZONTAUX (FSE+) */}
        {config?.principesHorizontauxObligatoires && (
          <div className="section">
            <div className="section-title">3. PRINCIPES HORIZONTAUX OBLIGATOIRES</div>
            <div className="ph-grid">
              <div className={`ph-item ${phEgaliteHF ? 'ok' : ''}`}>
                <div className="ph-icon">{phEgaliteHF ? '✅' : '⬜'}</div>
                <p>Égalité femmes / hommes</p>
              </div>
              <div className={`ph-item ${phNonDiscrimination ? 'ok' : ''}`}>
                <div className="ph-icon">{phNonDiscrimination ? '✅' : '⬜'}</div>
                <p>Égalité des chances / Non-discrimination</p>
              </div>
              <div className={`ph-item ${phDeveloppementDurable ? 'ok' : ''}`}>
                <div className="ph-icon">{phDeveloppementDurable ? '✅' : '⬜'}</div>
                <p>Développement durable</p>
              </div>
            </div>
            {Boolean(fiche.ph_details) && (
              <div className="encart" style={{marginTop:10}}>
                <div className="encart-title">Justification des principes horizontaux</div>
                <p style={{fontSize:'9.5pt', lineHeight:1.5, whiteSpace:'pre-wrap'}}>{String(fiche.ph_details)}</p>
              </div>
            )}
          </div>
        )}

        {/* BUDGET */}
        <div className="section page-break">
          <div className="section-title">{config?.principesHorizontauxObligatoires ? '4' : '3'}. BUDGET PRÉVISIONNEL DÉTAILLÉ</div>

          {(budget as Array<Record<string, unknown>>).length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Type de dépense</th>
                  <th>Catégorie</th>
                  <th>Libellé</th>
                  <th className="right">Montant HT</th>
                  <th>Éligible</th>
                </tr>
              </thead>
              <tbody>
                {(budget as Array<Record<string, unknown>>).map((b, i) => (
                  <tr key={i}>
                    <td>{String(b.type_depense)}</td>
                    <td>{String(b.categorie)}</td>
                    <td>{String(b.libelle)}</td>
                    <td className="right">{formatEur(b.montant as number)}</td>
                    <td>{b.eligible ? <span className="badge badge-green">Oui</span> : <span className="badge badge-red">Non</span>}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={3}><strong>TOTAL BUDGET PRÉVISIONNEL</strong></td>
                  <td className="right"><strong>{formatEur(totalBudget)}</strong></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p style={{color:'#718096', fontStyle:'italic'}}>Budget non renseigné.</p>
          )}

          {/* Frais indirects */}
          {config?.tauxForfaitIndirect && (
            <div className="encart" style={{marginTop:8}}>
              <div className="encart-title">Dépenses indirectes (forfait réglementaire)</div>
              <p>Taux forfaitaire appliqué : <strong>{tauxIndirect}%</strong> des coûts directs de personnel
                {' '}(selon Règl. (UE) 2021/1060 – options : {config.tauxForfaitIndirect.join('%, ')}%)</p>
            </div>
          )}
        </div>

        {/* PLAN DE FINANCEMENT */}
        <div className="section">
          <div className="section-title">{config?.principesHorizontauxObligatoires ? '5' : '4'}. PLAN DE FINANCEMENT</div>
          {(financements as Array<Record<string, unknown>>).length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Financeur</th>
                  <th>Type</th>
                  <th className="right">Montant</th>
                  <th className="right">Taux</th>
                  <th>Confirmé</th>
                </tr>
              </thead>
              <tbody>
                {(financements as Array<Record<string, unknown>>).map((f, i) => (
                  <tr key={i}>
                    <td><strong>{String(f.financeur)}</strong></td>
                    <td>{String(f.type_financement || '—')}</td>
                    <td className="right">{formatEur(f.montant as number)}</td>
                    <td className="right">{Number(f.taux ?? 0).toFixed(1)}%</td>
                    <td>{f.confirme ? <span className="badge badge-green">Confirmé</span> : <span className="badge badge-orange">En attente</span>}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={2}><strong>TOTAL PLAN DE FINANCEMENT</strong></td>
                  <td className="right"><strong>{formatEur(totalFinancement)}</strong></td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p style={{color:'#718096', fontStyle:'italic'}}>Plan de financement non renseigné.</p>
          )}

          {/* Synthèse subvention */}
          <div className="encart encart-blue">
            <div className="grid-2">
              <div>
                <strong>Coût total du projet :</strong> {formatEur(coutTotal)}<br />
                <strong>Subvention demandée :</strong> {formatEur(montantSubvention)}<br />
                <strong>Taux de subvention :</strong> {tauxSubvention.toFixed(1)}%
              </div>
              <div>
                <strong>Autofinancement :</strong> {formatEur(coutTotal - montantSubvention)}<br />
                <strong>Taux d&apos;autofinancement :</strong> {(100 - tauxSubvention).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* PIÈCES JUSTIFICATIVES */}
        {(pieces as Array<Record<string, unknown>>).length > 0 && (
          <div className="section page-break">
            <div className="section-title">{config?.principesHorizontauxObligatoires ? '6' : '5'}. PIÈCES JUSTIFICATIVES À FOURNIR</div>
            <ul className="piece-list">
              {(pieces as Array<Record<string, unknown>>).map((p, i) => (
                <li key={i} className={p.statut === 'fournie' ? 'fournie' : ''}>
                  <span style={{flex:1}}>{LABELS_PIECES[p.code_piece as string] ?? String(p.libelle)}</span>
                  <span className={`badge ${p.statut === 'fournie' ? 'badge-green' : p.statut === 'non_applicable' ? '' : 'badge-orange'}`}>
                    {p.statut === 'fournie' ? 'Fournie' : p.statut === 'non_applicable' ? 'N/A' : 'À fournir'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* INDICATEURS (FSE+/FEDER) */}
        {config?.indicateursCommuns && config.indicateursCommuns.length > 0 && (
          <div className="section">
            <div className="section-title">7. INDICATEURS DE SUIVI OBLIGATOIRES</div>
            <ul style={{paddingLeft:20, fontSize:'9.5pt', lineHeight:1.8}}>
              {config.indicateursCommuns.map((ind, i) => (
                <li key={i}>{ind}</li>
              ))}
            </ul>
          </div>
        )}

        {/* OBLIGATIONS DE PUBLICITÉ */}
        {config?.publiciteFSEObligatoire && (
          <div className="section">
            <div className="section-title">8. OBLIGATIONS DE PUBLICITÉ ET COMMUNICATION</div>
            <div className="encart encart-blue">
              <div className="encart-title">Logos obligatoires à apposer sur tous les supports</div>
              <div className="logos-zone">
                {(config.logosObligatoires ?? []).map(l => (
                  <div key={l} className="logo-placeholder">{l.toUpperCase()}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MENTION LÉGALE */}
        {config?.mentionObligatoire && (
          <div className="section">
            <div className="mention-legale">
              <strong>MENTION LÉGALE OBLIGATOIRE</strong><br />
              {config.mentionObligatoire}
            </div>
          </div>
        )}

        {/* SIGNATURE */}
        <div className="section" style={{marginTop:30}}>
          <div className="section-title">CERTIFICATION ET SIGNATURE</div>
          <p style={{fontSize:'9.5pt', lineHeight:1.6, color:'#4a5568', marginBottom:20}}>
            Je soussigné(e), représentant légal de <strong>{String(fiche.porteur_nom || '____________')}</strong>,
            certifie l&apos;exactitude des informations contenues dans le présent dossier et m&apos;engage
            à respecter les obligations liées au financement sollicité, notamment les règles de publicité,
            de suivi et de justification des dépenses.
          </p>
          <div className="grid-2">
            <div>
              <div style={{borderBottom:'1px solid #2d3748', marginBottom:4, height:40}}></div>
              <p style={{fontSize:'9pt', color:'#718096'}}>Nom, Prénom et Qualité du signataire</p>
            </div>
            <div>
              <div style={{borderBottom:'1px solid #2d3748', marginBottom:4, height:40}}></div>
              <p style={{fontSize:'9pt', color:'#718096'}}>Lieu, date et signature (+ cachet)</p>
            </div>
          </div>
        </div>

        <div className="footer">
          <p>Document généré par FicheProjet Pro (SeyAmTi) — {new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR')}</p>
          <p>Base réglementaire : {config?.reglementBase ?? String(fiche.fonds_id)} | Référence dossier : FP-{String(fiche.id).padStart(4, '0')}</p>
        </div>

        <script dangerouslySetInnerHTML={{__html: `
          document.querySelector('.print-btn')?.addEventListener('click', () => window.print());
        `}} />
      </body>
    </html>
  );
}
