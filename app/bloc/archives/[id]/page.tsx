'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import ExportToolbar from '@/components/bloc/layout/ExportToolbar'
import { exporterCSV, exporterExcel, exporterPDF, imprimerSection, Colonne } from '@/lib/export/export'
import { fmtDate, fmtDateHeure, fmtHeure, nomPersonne, collecterEquipe, construireChronologie, libelleAnesthesie } from '@/lib/export/dossier-patient'
import PiecesJointesUploader from '@/components/bloc/pieces-jointes/PiecesJointesUploader'
import { formaterNomPatient } from '@/lib/patient'

export default function ArchiveDetailPage() {
  const params = useParams()
  const router = useRouter()
  const patientId = params.id as string

  const [dossier, setDossier] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!patientId) return
    ;(async () => {
      setLoading(true)
      try {
        const { data } = await apiClient.get(`/archives/dossier/${patientId}`)
        setDossier(data)
      } catch (err) {
        console.error('Erreur chargement dossier:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [patientId])

  const equipe = useMemo(() => (dossier ? collecterEquipe(dossier) : []), [dossier])
  const chronologie = useMemo(() => (dossier ? construireChronologie(dossier) : []), [dossier])

  if (loading) return <main className="p-8"><div className="max-w-4xl mx-auto text-on-surface-variant">Chargement du dossier...</div></main>
  if (!dossier) return <main className="p-8"><div className="max-w-4xl mx-auto text-on-surface-variant">Dossier introuvable.</div></main>

  const p = dossier.patient || {}
  const age = p.dateNaissance ? new Date().getFullYear() - new Date(p.dateNaissance).getFullYear() : '?'
  const nomComplet = formaterNomPatient(p)
  const nomFichier = `dossier-${nomComplet.replace(/\s+/g, '-')}`

  const colonnesChrono: Colonne[] = [
    { cle: 'etape', titre: 'Étape' },
    { cle: 'date', titre: 'Date / Heure' },
    { cle: 'detail', titre: 'Détail' },
    { cle: 'personnel', titre: 'Personnel' },
  ]
  const colonnesEquipe: Colonne[] = [
    { cle: 'nom', titre: 'Nom' },
    { cle: 'role', titre: 'Rôle' },
    { cle: 'etapesTxt', titre: 'Étapes' },
  ]
  const lignesEquipeExport = equipe.map(m => ({ ...m, etapesTxt: Array.from(m.etapes).join(', ') }))

  return (
    <main className="min-h-screen flex flex-col bg-surface">
      <div className="sticky z-30 bg-white border-b border-surface-variant/20 px-8 py-3 flex items-center gap-4 shadow-sm top-0 print:hidden">
        <button onClick={() => router.push('/bloc/archives')} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-xs font-bold">
          <span className="material-symbols-outlined">arrow_back</span>
          Archives
        </button>
        <span className="text-sm font-bold text-primary font-headline">Dossier patient complet</span>
        <div className="ml-auto">
          <ExportToolbar
            onImprimer={imprimerSection}
            onCSV={() => exporterCSV(colonnesChrono, chronologie, nomFichier)}
            onExcel={() => exporterExcel([
              { nom: 'Chronologie', colonnes: colonnesChrono, lignes: chronologie },
              { nom: 'Équipe', colonnes: colonnesEquipe, lignes: lignesEquipeExport },
            ], nomFichier)}
            onPDF={() => exporterPDF(
              `Dossier patient — ${nomComplet}`,
              `Archivé le ${fmtDateHeure(dossier.dateArchivage)}`,
              [
                { titre: 'Chronologie du parcours', colonnes: colonnesChrono, lignes: chronologie },
                { titre: 'Personnel intervenu', colonnes: colonnesEquipe, lignes: lignesEquipeExport },
              ],
              nomFichier
            )}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* En-tête patient */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 border border-surface-variant/10 p-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-headline text-3xl font-extrabold text-on-surface">{nomComplet}</h1>
              <p className="text-sm text-on-surface-variant flex items-center gap-3 mt-1 flex-wrap">
                <span>Né le {fmtDate(p.dateNaissance)} ({age} ans)</span>
                <span className="w-1.5 h-1.5 bg-on-surface-variant rounded-full opacity-30"></span>
                <span>Groupe sanguin : <strong>{p.groupeSanguin || '—'}</strong></span>
              </p>
            </div>
            <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase">{p.statut || '—'}</span>
          </div>

          {/* Équipe intervenue — reconstituée à partir des données réelles de chaque étape */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 border border-surface-variant/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <div>
                <h2 className="font-headline text-lg font-bold text-on-surface">Personnel intervenu</h2>
                <p className="text-xs text-on-surface-variant">Tous les professionnels ayant pris en charge ce patient</p>
              </div>
            </div>
            {equipe.length === 0 ? (
              <p className="text-sm text-on-surface-variant italic">Aucun personnel enregistré pour l'instant.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {equipe.map((m, i) => (
                  <div key={i} className="p-3 bg-surface-container-lowest rounded-xl border border-surface-variant/20">
                    <p className="text-sm font-bold text-on-surface">{m.nom}</p>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wide">{m.role}</p>
                    <p className="text-[10px] text-on-surface-variant mt-1">{Array.from(m.etapes).join(' • ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 1. Prescription reçue */}
          <SectionEtape numero={1} icone="notifications" couleur="sky" titre="Prescription reçue">
            {(dossier.notifications?.length || 0) === 0 && (dossier.demandesCpaExternes?.length || 0) === 0 ? (
              <VideMessage texte="Aucune prescription enregistrée." />
            ) : (
              <div className="space-y-2">
                {dossier.notifications?.map((n: any) => (
                  <LigneDetail key={n.id}
                    gauche={n.intervention || 'Intervention'}
                    droite={fmtDateHeure(n.createdAt)}
                    badges={[n.estUrgent ? { texte: 'Urgent', couleur: 'red' } : null, { texte: n.statut, couleur: 'sky' }]}
                    personnel={nomPersonne(n.chirurgien, n.chirurgienNom)}
                  />
                ))}
                {dossier.demandesCpaExternes?.map((e: any) => (
                  <LigneDetail key={e.id}
                    gauche={`${e.motif || e.typeAnesthesie || 'Demande externe'} (${e.sourceServiceName || e.sourceServiceId})`}
                    droite={fmtDateHeure(e.createdAt)}
                    badges={[{ texte: e.statut, couleur: 'sky' }]}
                  />
                ))}
              </div>
            )}
          </SectionEtape>

          {/* 2. CPA */}
          <SectionEtape numero={2} icone="assignment_turned_in" couleur="amber" titre="Consultation Pré-Anesthésique (CPA)">
            {!dossier.cpa ? <VideMessage texte="Aucune CPA enregistrée." /> : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge texte={dossier.cpa.decision} couleur={dossier.cpa.decision === 'APTE' ? 'emerald' : dossier.cpa.decision === 'INAPTE' ? 'red' : 'orange'} />
                  {dossier.cpa.scoreASA != null && <Badge texte={`ASA ${dossier.cpa.scoreASA}`} couleur="amber" />}
                  <Badge texte={libelleAnesthesie(dossier.cpa)} couleur="sky" />
                  <span className="text-xs text-on-surface-variant ml-auto">{fmtDate(dossier.cpa.dateConsultation)}</span>
                </div>
                {dossier.cpa.motifRefus && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{dossier.cpa.motifRefus}</p>}
                <ChampsGrid champs={[
                  ['Anesthésiste', nomPersonne(dossier.cpa.anesthesiste)],
                  ['Mallampati', dossier.cpa.mallampati],
                  ['Technique d\'intubation', dossier.cpa.techniqueIntubation],
                  ['Antécédents anesthésie', dossier.cpa.antecedentsAnesthesie ? 'Oui' : 'Non'],
                ]} />
                {dossier.cpa.medicamentsAnesthesieReanimation?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">Médicaments d'anesthésie / réanimation ({dossier.cpa.medicamentsAnesthesieReanimation.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {dossier.cpa.medicamentsAnesthesieReanimation.map((m: any, i: number) => (
                        <span key={i} className="px-2 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] font-semibold text-amber-800">{m.nom}</span>
                      ))}
                    </div>
                  </div>
                )}
                {dossier.cpa.piecesJointes?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">Pièces jointes ({dossier.cpa.piecesJointes.length})</p>
                    <PiecesJointesUploader value={dossier.cpa.piecesJointes} onChange={() => {}} disabled />
                  </div>
                )}
              </div>
            )}
          </SectionEtape>

          {/* 3. Vérification veille */}
          <SectionEtape numero={3} icone="event_available" couleur="indigo" titre="Vérification à la veille">
            {!dossier.verificationVeille ? <VideMessage texte="Non applicable ou non encore réalisée." /> : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge texte={dossier.verificationVeille.statut} couleur="indigo" />
                  <span className="text-xs text-on-surface-variant ml-auto">{fmtDate(dossier.verificationVeille.dateVisite)}</span>
                </div>
                <ChampsGrid champs={[
                  ['Anesthésiste', nomPersonne(dossier.verificationVeille.anesthesiste)],
                  ['Jeûne respecté', dossier.verificationVeille.jeuneRespected ? 'Oui' : 'Non'],
                  ['Instructions respectées', dossier.verificationVeille.instructionsRespectees ? 'Oui' : 'Non'],
                  ['Prémédication faite', dossier.verificationVeille.premedicationFaite ? 'Oui' : 'Non'],
                  ['Heure de départ prévue', dossier.verificationVeille.heureDepart],
                ]} />
              </div>
            )}
          </SectionEtape>

          {/* 4. Check-list avant opération (Sign In) */}
          <SectionEtape numero={4} icone="checklist" couleur="blue" titre="Check-list avant opération (Sign In)">
            {(dossier.checklistsAvantOp?.length || 0) === 0 ? <VideMessage texte="Non encore réalisée." /> : (
              dossier.checklistsAvantOp.map((c: any) => (
                <LigneDetail key={c.id} gauche={`Check-list Sign In — ${fmtDate(c.dateCreation)}`} droite=""
                  badges={[{ texte: c.statut, couleur: 'blue' }]} personnel={c.validateurNom} />
              ))
            )}
          </SectionEtape>

          {/* 5. Check-list avant incision (Time Out) */}
          <SectionEtape numero={5} icone="pause_circle" couleur="teal" titre="Check-list avant incision (Time Out)">
            {(dossier.checklistsPendantOp?.length || 0) === 0 ? <VideMessage texte="Non encore réalisée." /> : (
              dossier.checklistsPendantOp.map((c: any) => (
                <LigneDetail key={c.id} gauche={`Time Out — ${fmtDate(c.dateCreation)}`} droite=""
                  badges={[{ texte: c.statut, couleur: 'teal' }]} personnel={c.validateurNom} />
              ))
            )}
          </SectionEtape>

          {/* 6. Chronologie des moments opératoires */}
          <SectionEtape numero={6} icone="timeline" couleur="rose" titre="Chronologie de l'opération">
            {(dossier.momentsOperatoires?.length || 0) === 0 ? <VideMessage texte="Aucun moment horodaté." /> : (
              <ul className="space-y-1.5 max-h-80 overflow-y-auto">
                {dossier.momentsOperatoires.map((m: any) => (
                  <li key={m.id} className={`flex items-center gap-3 text-sm px-3 py-2 rounded-lg border ${m.annule ? 'opacity-40 line-through border-transparent' : 'bg-rose-50/50 border-rose-100'}`}>
                    <span className="font-mono text-xs font-bold text-on-surface-variant shrink-0">{fmtHeure(m.horodatage)}</span>
                    <span className="font-semibold flex-1">{m.label}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-bold uppercase shrink-0">{m.categorie}</span>
                    <span className="text-xs text-on-surface-variant shrink-0">{m.auteurNom}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionEtape>

          {/* 6bis. Surveillance per-opératoire */}
          <SectionEtape numero={7} icone="monitor_heart" couleur="emerald" titre="Surveillance per-opératoire">
            {(dossier.activitesPerOp?.length || 0) === 0 ? <VideMessage texte="Aucune activité enregistrée." /> : (
              dossier.activitesPerOp.map((a: any) => (
                <div key={a.id} className="space-y-3 pb-3 mb-3 border-b border-surface-variant/20 last:border-0 last:pb-0 last:mb-0">
                  <ChampsGrid champs={[
                    ['Chirurgien', nomPersonne(a.chirurgien)],
                    ['Anesthésiste', nomPersonne(a.anesthesiste)],
                    ['Date', fmtDate(a.dateOperation)],
                    ['État à l\'arrivée', a.etatArrivee?.join(', ') || '—'],
                    ['Perfusions', a.perfusions || '—'],
                    ['Transfusions', a.transfusions || '—'],
                  ]} />
                  {a.constantes?.length > 0 && (
                    <div className="overflow-x-auto">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-1">Constantes ({a.constantes.length} mesures)</p>
                      <table className="w-full text-xs">
                        <thead className="bg-emerald-50 text-emerald-800"><tr>
                          <th className="px-2 py-1 text-left">Heure</th><th className="px-2 py-1">FC</th><th className="px-2 py-1">TA</th><th className="px-2 py-1">SPO2</th><th className="px-2 py-1">Temp</th>
                        </tr></thead>
                        <tbody className="divide-y divide-surface-variant/10">
                          {a.constantes.map((c: any) => (
                            <tr key={c.id}><td className="px-2 py-1 font-mono">{c.heure || fmtHeure(c.horodatage)}</td><td className="px-2 py-1 text-center">{c.fc}</td><td className="px-2 py-1 text-center">{c.ta}</td><td className="px-2 py-1 text-center">{c.spo2}</td><td className="px-2 py-1 text-center">{c.temperature}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            )}
          </SectionEtape>

          {/* 7. Check-list après intervention (Sign Out) */}
          <SectionEtape numero={8} icone="assignment_turned_in" couleur="blue" titre="Check-list après intervention (Sign Out)">
            {(dossier.checklistsApresOp?.length || 0) === 0 ? <VideMessage texte="Non encore réalisée." /> : (
              dossier.checklistsApresOp.map((c: any) => (
                <div key={c.id} className="space-y-1">
                  <LigneDetail gauche={`Sign Out — ${fmtDate(c.dateCreation)}`} droite="" badges={[{ texte: c.statut, couleur: 'blue' }]} personnel={c.validateurNom} />
                </div>
              ))
            )}
          </SectionEtape>

          {/* 8. Protocole anesthésique + Instructions post-opératoires
              (même enregistrement, voir InstructionsPostOpForm) */}
          <SectionEtape numero={9} icone="clinical_notes" couleur="violet" titre="Protocole anesthésique">
            {(dossier.protocolesOperatoires?.length || 0) === 0 ? <VideMessage texte="Aucun protocole enregistré." /> : (
              dossier.protocolesOperatoires.map((pr: any) => (
                <div key={pr.id} className="space-y-3 pb-3 mb-3 border-b border-surface-variant/20 last:border-0 last:pb-0 last:mb-0">
                  <ChampsGrid champs={[
                    ['Anesthésiste', nomPersonne(pr.anesthesiste)],
                    ['Infirmière', nomPersonne(pr.infirmiere)],
                    ['Aide opératoire', nomPersonne(pr.aideOperatoire)],
                    ['Date', fmtDate(pr.dateOperation)],
                  ]} />
                  {pr.compteRenduAnesthesique && (
                    <div>
                      <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wide mb-1">Protocole anesthésique (anesthésiste)</p>
                      <p className="text-sm text-on-surface-variant leading-relaxed bg-violet-50/50 border border-violet-100 p-3 rounded-xl">{pr.compteRenduAnesthesique}</p>
                    </div>
                  )}
                  <InstructionsPostOpDetail protocole={pr} />
                </div>
              ))
            )}
          </SectionEtape>

          {/* 9. Score SCCRE + sortie de réveil */}
          <SectionEtape numero={10} icone="bed" couleur="cyan" titre="Salle de réveil">
            {(dossier.scoresSCCRE?.length || 0) === 0 && (dossier.sortiesReveil?.length || 0) === 0 ? <VideMessage texte="Patient pas encore passé en salle de réveil." /> : (
              <div className="space-y-3">
                {dossier.scoresSCCRE?.map((s: any) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-black text-cyan-700">{s.scoreTotal}<span className="text-xs font-medium text-on-surface-variant">/10</span></span>
                    <Badge texte={`SCCRE ${fmtDate(s.dateEvaluation)}`} couleur="cyan" />
                    <span className="text-xs text-on-surface-variant">Anesthésiste : {nomPersonne(s.anesthesiste) || '—'}</span>
                  </div>
                ))}
                {dossier.sortiesReveil?.map((s: any) => (
                  <LigneDetail key={s.id}
                    gauche={s.versServiceOrigine ? "Retour vers le service d'origine" : `Orienté vers : ${(s.autresServicesDestination || []).join(', ')}`}
                    droite={fmtDateHeure(s.dateHeureSortie)}
                    badges={[{ texte: s.statut, couleur: 'cyan' }]}
                    personnel={nomPersonne(s.medecin)}
                  />
                ))}
              </div>
            )}
          </SectionEtape>
        </div>
      </div>
    </main>
  )
}

// ————— Sous-composants d'affichage (locaux à cette page) —————

const COULEUR_SECTION: Record<string, { bg: string; text: string; border: string }> = {
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },
}

function SectionEtape({ numero, icone, couleur, titre, children }: { numero: number; icone: string; couleur: string; titre: string; children: React.ReactNode }) {
  const c = COULEUR_SECTION[couleur] || COULEUR_SECTION.blue
  return (
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 border border-surface-variant/10 overflow-hidden break-inside-avoid">
      <div className={`px-5 py-3 flex items-center gap-3 ${c.bg} border-b ${c.border}`}>
        <span className={`w-7 h-7 rounded-full bg-white flex items-center justify-center text-[11px] font-black ${c.text} shadow-sm`}>{numero}</span>
        <span className={`material-symbols-outlined ${c.text}`}>{icone}</span>
        <h2 className={`font-headline text-sm font-extrabold uppercase tracking-wide ${c.text}`}>{titre}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function VideMessage({ texte }: { texte: string }) {
  return <p className="text-sm text-on-surface-variant italic">{texte}</p>
}

function Badge({ texte, couleur }: { texte: string; couleur: string }) {
  const c = COULEUR_SECTION[couleur] || COULEUR_SECTION.blue
  return <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${c.bg} ${c.text}`}>{texte}</span>
}

function LigneDetail({ gauche, droite, badges, personnel }: { gauche: string; droite: string; badges?: ({ texte: string; couleur: string } | null)[]; personnel?: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-surface-container-lowest rounded-xl border border-surface-variant/10">
      <span className="text-sm font-semibold text-on-surface flex-1 min-w-[160px]">{gauche}</span>
      {badges?.filter(Boolean).map((b, i) => <Badge key={i} texte={b!.texte} couleur={b!.couleur} />)}
      {personnel && <span className="text-xs text-on-surface-variant">{personnel}</span>}
      {droite && <span className="text-xs text-on-surface-variant font-mono">{droite}</span>}
    </div>
  )
}

function ChampsGrid({ champs }: { champs: [string, any][] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {champs.map(([label, valeur], i) => (
        <div key={i} className="space-y-0.5">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{label}</p>
          <p className="text-sm font-bold text-on-surface">{valeur === undefined || valeur === null || valeur === '' ? '—' : String(valeur)}</p>
        </div>
      ))}
    </div>
  )
}

const LABEL_SURVEILLANCE: Record<string, string> = { ta: 'TA', pouls: 'Pouls', fr: 'FR', temperature: 'Température', diurese: 'Diurèse', autres: 'Autres' }
const LABEL_TYPE_DRAINAGE: Record<string, string> = {
  SONDE_NASO_GASTRIQUE: 'Sonde naso-gastrique', DRAIN_CRANE: 'Drain crâne', DRAIN_THORAX: 'Drain thorax',
  DRAIN_ABDOMEN: 'Drain abdomen', MEMBRE_SEIN_AUTRES: 'Membre - Sein - Autres',
}
const LABEL_MODE_DRAINAGE: Record<string, string> = { SIPHON: 'Siphonnage', ASPIRATION: 'Aspiratif', REDON: 'Redon' }
const LABEL_COTE: Record<string, string> = { GAUCHE: 'Gauche', DROITE: 'Droite' }
const LABEL_PERFUSION: Record<string, string> = { perfusionBrasGauche: 'Bras gauche', perfusionBrasDroit: 'Bras droit', voieCentrale: 'Voie centrale' }

// Détail des Instructions post-opératoires (Surveillance / Drainages / Prescription à suivre),
// remplies par l'anesthésiste — voir InstructionsPostOpForm côté formulaire.
function InstructionsPostOpDetail({ protocole: pr }: { protocole: any }) {
  const surveillanceActive = Object.entries(pr.surveillance || {}).filter(([, v]: any) => v && typeof v === 'object' ? v.coche : v)
  const drainages: any[] = Array.isArray(pr.drainages) ? pr.drainages : []
  const perfusions = Object.entries(pr.prescriptions || {}).filter(([cle, v]: any) => LABEL_PERFUSION[cle] && (v?.valeur || v?.enY))
  const traitements = ['antibiotiques', 'antalgiques', 'autres'].filter((cle) => pr.prescriptions?.[cle])

  if (!surveillanceActive.length && !drainages.length && !perfusions.length && !traitements.length) return null

  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 space-y-3">
      <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wide">Instructions post-opératoires</p>
      {surveillanceActive.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {surveillanceActive.map(([cle, v]: any) => (
            <span key={cle} className="px-2 py-1 bg-white border border-violet-100 rounded-full text-[11px] font-semibold text-on-surface">
              {LABEL_SURVEILLANCE[cle] || cle}{v?.valeur ? ` : ${v.valeur}` : ''}
            </span>
          ))}
        </div>
      )}
      {drainages.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {drainages.map((d: any) => (
            <span key={d.id} className="px-2 py-1 bg-white border border-violet-100 rounded-full text-[11px] font-semibold text-on-surface">
              {LABEL_TYPE_DRAINAGE[d.type] || d.type}{d.cote ? ` (${LABEL_COTE[d.cote] || d.cote})` : ''} — {LABEL_MODE_DRAINAGE[d.mode] || d.mode}
            </span>
          ))}
        </div>
      )}
      {(perfusions.length > 0 || traitements.length > 0) && (
        <div className="text-xs text-on-surface-variant space-y-1">
          {perfusions.map(([cle, v]: any) => (
            <p key={cle}><strong>{LABEL_PERFUSION[cle]}</strong> : {v.valeur || '—'}{v.enY ? ` (En Y : ${v.enY})` : ''}</p>
          ))}
          {traitements.map((cle) => (
            <p key={cle}><strong>{cle.charAt(0).toUpperCase() + cle.slice(1)}</strong> : {pr.prescriptions[cle]}</p>
          ))}
        </div>
      )}
    </div>
  )
}
