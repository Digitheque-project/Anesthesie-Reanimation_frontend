'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { patientService } from '@/lib/api'
import { apiClient } from '@/lib/api/client'
import ExportToolbar from '@/components/bloc/layout/ExportToolbar'
import { exporterCSV, exporterExcel, exporterPDF, imprimerSection, Colonne } from '@/lib/export/export'
import { fmtDate, fmtDateHeure, collecterEquipe, construireChronologie } from '@/lib/export/dossier-patient'
import { formaterNomPatient } from '@/lib/patient'

type Onglet = 'OPERES' | 'DEMANDES_EXTERNES'

const STATUT_STYLE: Record<string, string> = {
  SORTI: 'bg-emerald-100 text-emerald-700',
  EN_SALLE_REVEIL: 'bg-cyan-100 text-cyan-700',
  EN_COURS_OPERATION: 'bg-rose-100 text-rose-700',
  PRET_POUR_BLOC: 'bg-blue-100 text-blue-700',
  CPA_INAPTE: 'bg-red-100 text-red-700',
}

// Le parcours "demande CPA externe" (avis demandé par un autre service, patient non opéré ici)
// n'a pas de fiche PatientBloc — sans objet pour SORTI. Sa fin de parcours à lui, c'est le
// renvoi du résultat au service demandeur, marqué par l'un de ces statuts sur la demande
// elle-même (voir DemandeCpaExterneService) — jamais EN_ATTENTE/PLANIFIEE, qui restent "en cours".
const STATUTS_DEMANDE_TERMINES = ['CPA_REALISEE', 'VPA_REALISEE', 'CONFIRMEE', 'REPORTEE', 'ANNULEE']
const STATUT_DEMANDE_INFO: Record<string, { style: string; label: string; icon: string }> = {
  CPA_REALISEE: { style: 'bg-emerald-100 text-emerald-700', label: 'CPA réalisée', icon: 'check_circle' },
  VPA_REALISEE: { style: 'bg-emerald-100 text-emerald-700', label: 'VPA réalisée', icon: 'check_circle' },
  CONFIRMEE: { style: 'bg-emerald-100 text-emerald-700', label: 'Confirmée', icon: 'verified' },
  REPORTEE: { style: 'bg-orange-100 text-orange-700', label: 'Reportée', icon: 'event_busy' },
  ANNULEE: { style: 'bg-gray-200 text-gray-600', label: 'Annulée', icon: 'cancel' },
}

export default function ArchivesPage() {
  const router = useRouter()
  const [onglet, setOnglet] = useState<Onglet>('OPERES')

  // --- Patients opérés (parcours complet du bloc, jusqu'à la sortie) ---------------------
  // Défilement continu plutôt que pagination : la page suivante se charge silencieusement en
  // arrivant en bas de la liste, ajoutée à la suite plutôt que de remplacer l'écran.
  const LIMITE_PATIENTS = 20
  const [patients, setPatients] = useState<any[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [loadingPlus, setLoadingPlus] = useState(false)
  const [total, setTotal] = useState(0)
  // Compte des patients CPA_INAPTE déjà fusionnés dans `patients` — nécessaire pour que le total
  // affiché reste cohérent quand chargerPlusPatients recalcule sa propre part (SORTI uniquement),
  // sinon le total "oubliait" ce compte dès le premier scroll (page suivante).
  const [totalInaptes, setTotalInaptes] = useState(0)
  const [pageActuelle, setPageActuelle] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // --- Demandes CPA externes (parcours court : avis demandé, résultat renvoyé) ------------
  const [demandes, setDemandes] = useState<any[]>([])
  const [loadingDemandes, setLoadingDemandes] = useState(true)
  const [filtreStatutDemande, setFiltreStatutDemande] = useState('Tous')

  // --- Filtres communs ---------------------------------------------------------------------
  const [recherche, setRecherche] = useState('')
  const [showFiltres, setShowFiltres] = useState(true)
  const [filtreSexe, setFiltreSexe] = useState('Tous')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [exportPdfEnCours, setExportPdfEnCours] = useState<string | null>(null)

  useEffect(() => { chargerPatients() }, [recherche, filtreSexe, dateDebut, dateFin])
  useEffect(() => { chargerDemandes() }, [])

  const filtresActifsPatients = (liste: any[]) => {
    let filtered = liste
    if (filtreSexe !== 'Tous') filtered = filtered.filter((p: any) => p.sexe === filtreSexe)
    if (dateDebut) filtered = filtered.filter((p: any) => new Date(p.dateIntervention || p.updatedAt) >= new Date(dateDebut))
    if (dateFin) filtered = filtered.filter((p: any) => new Date(p.dateIntervention || p.updatedAt) <= new Date(dateFin))
    return filtered
  }

  // Patients dont la CPA a conclu à une inaptitude définitive (opération refusée, ou reportée
  // sans qu'une nouvelle date ne soit encore retenue) — fin de parcours au bloc sans jamais
  // passer par SORTI. Chargés à part (liste courte, pas de pagination) et fusionnés avec les
  // patients sortis pour qu'ils restent consultables/exportables comme n'importe quel dossier
  // archivé, plutôt que de disparaître silencieusement de l'app.
  const chargerPatientsInaptes = async () => {
    try {
      const data = await patientService.getAll({ statut: 'CPA_INAPTE', page: 1, limite: 200 })
      return data.data || []
    } catch (err) {
      console.error('Erreur:', err)
      return []
    }
  }

  const chargerPatients = async () => {
    setLoadingPatients(true)
    try {
      const [data, inaptes] = await Promise.all([
        patientService.getAll({
          statut: 'SORTI',
          page: 1,
          limite: LIMITE_PATIENTS,
          recherche: recherche || undefined,
        }),
        chargerPatientsInaptes(),
      ])
      const lignes = data.data || []
      setPatients(filtresActifsPatients([...inaptes, ...lignes]))
      setTotal((data.total || 0) + inaptes.length)
      setTotalInaptes(inaptes.length)
      setPageActuelle(1)
      setHasMore(lignes.length < (data.total || 0))
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setLoadingPatients(false)
    }
  }

  // Appelée en arrivant en bas de la liste — ajoute la page suivante à la suite de celle déjà
  // affichée, sans jamais remplacer ce qui est déjà chargé.
  const chargerPlusPatients = async () => {
    if (loadingPlus || loadingPatients || !hasMore) return
    setLoadingPlus(true)
    try {
      const pageSuivante = pageActuelle + 1
      const data = await patientService.getAll({
        statut: 'SORTI',
        page: pageSuivante,
        limite: LIMITE_PATIENTS,
        recherche: recherche || undefined,
      })
      const lignes = data.data || []
      setPatients(prev => [...prev, ...filtresActifsPatients(lignes)])
      setTotal((data.total || 0) + totalInaptes)
      setPageActuelle(pageSuivante)
      setHasMore(pageSuivante * LIMITE_PATIENTS < (data.total || 0))
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setLoadingPlus(false)
    }
  }

  const handleScrollPatients = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      chargerPlusPatients()
    }
  }

  const chargerDemandes = async () => {
    setLoadingDemandes(true)
    try {
      const { data } = await apiClient.get('/demandes-cpa-externes')
      const toutes = Array.isArray(data) ? data : []
      setDemandes(toutes.filter((d: any) => STATUTS_DEMANDE_TERMINES.includes(d.statut)))
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setLoadingDemandes(false)
    }
  }

  const demandesFiltrees = useMemo(() => {
    let filtered = demandes
    if (filtreStatutDemande !== 'Tous') filtered = filtered.filter((d: any) => d.statut === filtreStatutDemande)
    if (recherche.trim()) {
      const q = recherche.trim().toLowerCase()
      filtered = filtered.filter((d: any) => formaterNomPatient(d).toLowerCase().includes(q) || String(d.sourceServiceName || '').toLowerCase().includes(q))
    }
    if (dateDebut) filtered = filtered.filter((d: any) => new Date(d.updatedAt || d.createdAt) >= new Date(dateDebut))
    if (dateFin) filtered = filtered.filter((d: any) => new Date(d.updatedAt || d.createdAt) <= new Date(dateFin))
    return filtered
  }, [demandes, filtreStatutDemande, recherche, dateDebut, dateFin])

  // Récupère l'ensemble des patients archivés correspondant aux filtres (pas seulement la page
  // affichée), pour les exports Excel/CSV/PDF/impression du tableau complet.
  const chargerTousLesPatients = async () => {
    const [data, inaptes] = await Promise.all([
      patientService.getAll({ statut: 'SORTI', page: 1, limite: 1000, recherche: recherche || undefined }),
      chargerPatientsInaptes(),
    ])
    return filtresActifsPatients([...inaptes, ...(data.data || [])])
  }

  const colonnesListe: Colonne[] = [
    { cle: 'nomComplet', titre: 'Nom & Prénom' },
    { cle: 'sexe', titre: 'Sexe' },
    { cle: 'dateOperation', titre: "Date d'opération" },
    { cle: 'intervention', titre: 'Intervention' },
    { cle: 'chirurgien', titre: 'Chirurgien' },
    { cle: 'statut', titre: 'Statut' },
  ]
  const versLignesExport = (liste: any[]) => liste.map(p => ({
    nomComplet: formaterNomPatient(p),
    sexe: p.sexe || 'H',
    dateOperation: fmtDate(p.dateIntervention || p.updatedAt),
    intervention: p.libelle || '—',
    chirurgien: p.chirurgien_nom || '—',
    statut: p.statut || '—',
  }))

  const colonnesDemandes: Colonne[] = [
    { cle: 'nomComplet', titre: 'Nom & Prénom' },
    { cle: 'serviceSource', titre: 'Service demandeur' },
    { cle: 'motif', titre: 'Motif' },
    { cle: 'date', titre: 'Date' },
    { cle: 'statut', titre: 'Décision' },
  ]
  const versLignesExportDemandes = (liste: any[]) => liste.map(d => ({
    nomComplet: formaterNomPatient(d),
    serviceSource: d.sourceServiceName || d.sourceServiceId || '—',
    motif: d.motif || d.typeAnesthesie || '—',
    date: fmtDate(d.updatedAt || d.createdAt),
    statut: STATUT_DEMANDE_INFO[d.statut]?.label || d.statut,
  }))

  const handleExportCSV = async () => onglet === 'OPERES'
    ? exporterCSV(colonnesListe, versLignesExport(await chargerTousLesPatients()), 'archives-bloc-operatoire')
    : exporterCSV(colonnesDemandes, versLignesExportDemandes(demandesFiltrees), 'archives-demandes-cpa-externes')
  const handleExportExcel = async () => onglet === 'OPERES'
    ? exporterExcel([{ nom: 'Archives', colonnes: colonnesListe, lignes: versLignesExport(await chargerTousLesPatients()) }], 'archives-bloc-operatoire')
    : exporterExcel([{ nom: 'Demandes CPA externes', colonnes: colonnesDemandes, lignes: versLignesExportDemandes(demandesFiltrees) }], 'archives-demandes-cpa-externes')
  const handleExportPDF = async () => onglet === 'OPERES'
    ? exporterPDF('Archives opératoires', `${total} patient(s) archivé(s)`, [{ titre: 'Patients archivés', colonnes: colonnesListe, lignes: versLignesExport(await chargerTousLesPatients()) }], 'archives-bloc-operatoire')
    : exporterPDF('Demandes CPA externes traitées', `${demandesFiltrees.length} demande(s)`, [{ titre: 'Demandes traitées', colonnes: colonnesDemandes, lignes: versLignesExportDemandes(demandesFiltrees) }], 'archives-demandes-cpa-externes')

  // Export PDF complet d'un dossier patient (même contenu que la page détail), directement
  // depuis la liste — pratique pour imprimer/partager un dossier sans l'ouvrir.
  const handleExportDossierPDF = async (patientId: string, nomAffiche: string) => {
    setExportPdfEnCours(patientId)
    try {
      const { data: dossier } = await apiClient.get(`/archives/dossier/${patientId}`)
      const chronologie = construireChronologie(dossier)
      const equipe = collecterEquipe(dossier).map(m => ({ nom: m.nom, role: m.role, etapesTxt: Array.from(m.etapes).join(', ') }))
      await exporterPDF(
        `Dossier patient — ${nomAffiche}`,
        `Généré le ${fmtDateHeure(new Date())}`,
        [
          { titre: 'Chronologie du parcours', colonnes: [{ cle: 'etape', titre: 'Étape' }, { cle: 'date', titre: 'Date / Heure' }, { cle: 'detail', titre: 'Détail' }, { cle: 'personnel', titre: 'Personnel' }], lignes: chronologie },
          { titre: 'Personnel intervenu', colonnes: [{ cle: 'nom', titre: 'Nom' }, { cle: 'role', titre: 'Rôle' }, { cle: 'etapesTxt', titre: 'Étapes' }], lignes: equipe },
        ],
        `dossier-${nomAffiche.replace(/\s+/g, '-')}`
      )
    } catch (err) {
      console.error(err)
      alert("❌ Erreur lors de l'export du dossier")
    } finally {
      setExportPdfEnCours(null)
    }
  }

  return (
    <main className="p-4">
      <div className="">
        <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 className="font-display text-3xl font-extrabold text-on-surface tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl">inventory_2</span>
              Archives
            </h2>
            <p className="text-on-surface-variant mt-1">Deux parcours distincts : patients opérés dans ce bloc, et demandes de CPA/VPA externes traitées</p>
          </div>
          <ExportToolbar onImprimer={imprimerSection} onCSV={handleExportCSV} onExcel={handleExportExcel} onPDF={handleExportPDF} />
        </div>

        {/* Onglets */}
        <div className="mb-6 flex gap-2 bg-surface-container-low p-1.5 rounded-2xl w-fit border border-white/40 shadow-sm print:hidden">
          <button onClick={() => setOnglet('OPERES')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${onglet === 'OPERES' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-white'}`}>
            <span className="material-symbols-outlined text-lg">bed</span>
            Patients opérés
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${onglet === 'OPERES' ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>{total}</span>
          </button>
          <button onClick={() => setOnglet('DEMANDES_EXTERNES')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${onglet === 'DEMANDES_EXTERNES' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-white'}`}>
            <span className="material-symbols-outlined text-lg">link</span>
            Demandes CPA externes
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${onglet === 'DEMANDES_EXTERNES' ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>{demandes.length}</span>
          </button>
        </div>

        {/* Filtres avancés — affichés par défaut */}
        <section className="bg-surface-container-low rounded-3xl p-6 mb-8 border border-white/40 shadow-sm print:hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">filter_alt</span>
              <h3 className="font-headline font-bold text-on-surface">Filtres</h3>
            </div>
            <button onClick={() => setShowFiltres(!showFiltres)}
              className="flex items-center gap-1 text-primary text-sm font-bold hover:underline">
              <span className="material-symbols-outlined text-lg">{showFiltres ? 'expand_less' : 'expand_more'}</span>
              {showFiltres ? 'Masquer' : 'Afficher'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">search</span> Nom du patient
              </label>
              <input className="w-full bg-white border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-sm"
                placeholder="Rechercher..." type="text" value={recherche}
                onChange={e => setRecherche(e.target.value)} />
            </div>

            {showFiltres && (
              <>
                {onglet === 'OPERES' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">wc</span> Sexe
                    </label>
                    <div className="flex bg-white rounded-xl p-1 shadow-sm">
                      {['Tous', 'H', 'F'].map(s => (
                        <button key={s} onClick={() => setFiltreSexe(s)}
                          className={`flex-1 rounded-lg text-xs font-bold py-2 ${filtreSexe === s ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">rule</span> Décision
                    </label>
                    <select value={filtreStatutDemande} onChange={e => setFiltreStatutDemande(e.target.value)}
                      className="w-full bg-white border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-sm">
                      <option value="Tous">Toutes</option>
                      {STATUTS_DEMANDE_TERMINES.map(s => (
                        <option key={s} value={s}>{STATUT_DEMANDE_INFO[s]?.label || s}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">event</span> Date début
                  </label>
                  <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                    className="w-full bg-white border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">event</span> Date fin
                  </label>
                  <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
                    className="w-full bg-white border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-sm" />
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={onglet === 'OPERES' ? chargerPatients : chargerDemandes}
              className="bg-primary hover:bg-primary-container text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all transform active:scale-95 shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-[20px]">search_check</span>
              Appliquer le filtre
            </button>
          </div>
        </section>

        {onglet === 'OPERES' ? (
        <>
        {/* Tableau — Patients opérés */}
        <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-surface-container">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto" onScroll={handleScrollPatients}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim/30 border-b border-surface-container sticky top-0 z-10">
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Nom &amp; Prénom</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-center">Sexe</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Date d'opération</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Intervention</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Chirurgien</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Statut</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {loadingPatients ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant">Chargement...</td></tr>
                ) : patients.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant">Aucun patient archivé</td></tr>
                ) : patients.map(p => (
                  <tr key={p.id} className="hover:bg-surface-container-low transition-colors group cursor-pointer" onClick={() => router.push(`/bloc/archives/${p.id}`)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.sexe === 'F' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                          <span className="material-symbols-outlined text-[18px]">person</span>
                        </div>
                        <span className="text-sm font-bold text-on-surface">{formaterNomPatient(p)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${p.sexe === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                        {p.sexe || 'H'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-on-surface-variant/60">calendar_month</span>
                        {fmtDate(p.dateIntervention || p.updatedAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{p.libelle || '—'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-on-surface-variant/60">medical_services</span>
                        {p.chirurgien_nom || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${STATUT_STYLE[p.statut] || 'bg-surface-variant text-on-surface-variant'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>{p.statut || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right print:hidden" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleExportDossierPDF(p.id, formaterNomPatient(p))} disabled={exportPdfEnCours === p.id}
                          className="px-2 py-1.5 rounded-lg border text-[11px] font-bold hover:bg-surface-container transition-colors text-red-600 disabled:opacity-50"
                          title="Exporter le dossier complet en PDF">
                          <span className="material-symbols-outlined text-sm">{exportPdfEnCours === p.id ? 'progress_activity' : 'picture_as_pdf'}</span>
                        </button>
                        <button onClick={() => router.push(`/bloc/archives/${p.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-[11px] font-bold hover:bg-primary-container transition-colors flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          Informations
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {loadingPlus && (
                  <tr><td colSpan={7} className="px-6 py-4 text-center text-xs text-on-surface-variant">
                    <span className="inline-flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      Chargement de la suite...
                    </span>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-surface-container-low print:hidden">
            <p className="text-xs font-medium text-on-surface-variant">
              Affichage de <span className="font-bold">{patients.length}</span> sur <span className="font-bold">{total}</span> patients archivés
              {hasMore && !loadingPlus && <span className="italic"> — faites défiler pour en voir plus</span>}
            </p>
          </div>
        </div>
        </>
        ) : (
        <>
        {/* Tableau — Demandes CPA externes traitées */}
        <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-surface-container">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim/30 border-b border-surface-container sticky top-0 z-10">
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Nom &amp; Prénom</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Service demandeur</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Motif</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Décision</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {loadingDemandes ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">Chargement...</td></tr>
                ) : demandesFiltrees.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">Aucune demande de CPA externe traitée</td></tr>
                ) : demandesFiltrees.map((d: any) => {
                  const info = STATUT_DEMANDE_INFO[d.statut] || { style: 'bg-surface-variant text-on-surface-variant', label: d.statut, icon: 'help' }
                  return (
                    <tr key={d.id} className="hover:bg-surface-container-low transition-colors group cursor-pointer" onClick={() => router.push(`/bloc/demande-cpa-externe/${d.id}`)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-violet-100 text-violet-600">
                            <span className="material-symbols-outlined text-[18px]">person</span>
                          </div>
                          <span className="text-sm font-bold text-on-surface">{formaterNomPatient(d)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-blue-100 text-blue-700 rounded-full">
                          <span className="material-symbols-outlined text-sm">link</span>
                          {d.sourceServiceName || d.sourceServiceId || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">{d.motif || d.typeAnesthesie || '—'}</td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-on-surface-variant/60">calendar_month</span>
                          {fmtDate(d.updatedAt || d.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${info.style}`}>
                          <span className="material-symbols-outlined text-sm">{info.icon}</span>
                          {info.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right print:hidden" onClick={e => e.stopPropagation()}>
                        <button onClick={() => router.push(`/bloc/demande-cpa-externe/${d.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-[11px] font-bold hover:bg-primary-container transition-colors flex items-center gap-1.5 ml-auto">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          Informations
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="p-6 bg-surface-container-low flex items-center justify-between print:hidden">
            <p className="text-xs font-medium text-on-surface-variant">
              <span className="font-bold">{demandesFiltrees.length}</span> demande{demandesFiltrees.length > 1 ? 's' : ''} de CPA externe traitée{demandesFiltrees.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        </>
        )}
      </div>
    </main>
  )
}
