'use client'

import { useState, useEffect, useRef } from 'react'
import PatientStatsCards from '@/components/bloc/patient-du-jour/PatientStatsCards'
import PatientFilters from '@/components/bloc/patient-du-jour/PatientFilters'
import PatientsListTable from '@/components/bloc/patient-du-jour/PatientsListTable'
import ProgrammeAVenirModal from '@/components/bloc/patient-du-jour/ProgrammeAVenirModal'
import { patientService, notificationService } from '@/lib/api'
import type { FiltresPatient } from '@/types/bloc'
import { estServiceNonOperatoire } from '@/lib/programme-non-operatoire'
import { useRefetchOnFocus } from '@/lib/hooks/useRefetchOnFocus'
import { useRefetchOnRealtimeUpdate } from '@/lib/hooks/useRefetchOnRealtimeUpdate'

export default function PatientDuJourPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtres, setFiltres] = useState<FiltresPatient>({ statut: '', specialite: '', recherche: '', sexe: '', heureDebut: '', heureFin: '' })
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showProgrammeAVenir, setShowProgrammeAVenir] = useState(false)
  // Le loading plein écran n'apparaît qu'au tout premier chargement : les rafraîchissements
  // d'arrière-plan (temps réel, retour de focus) ne doivent pas faire clignoter "Chargement...".
  const aDejaCharge = useRef(false)

  useEffect(() => { charger() }, [selectedDate])

  const charger = async () => {
    try {
      if (!aDejaCharge.current) setLoading(true)
      // Le programme opératoire n'est plus figé sur "aujourd'hui" : on peut naviguer vers
      // n'importe quelle date. Les patients prêts/en cours dont l'intervention est prévue ce
      // jour-là (ou sans date renseignée, à traiter en priorité) y apparaissent.
      const [pretRes, encoursRes, notifsRes] = await Promise.all([
        patientService.getAll({ statut: 'PRET_POUR_BLOC', limite: 100 }),
        patientService.getAll({ statut: 'EN_COURS_OPERATION', limite: 100 }),
        notificationService.getAll(1, 100),
      ])
      const notifsData = notifsRes.data || []
      const estDateSelectionnee = (p: any) => !p.dateIntervention || new Date(p.dateIntervention).toISOString().split('T')[0] === selectedDate
      // Les patients venus par une demande de CPA externe d'un service qui n'opère pas au Bloc
      // (Imagerie, Endoscopie, Urgence...) ne font pas partie du programme opératoire du Bloc —
      // ils vivent dans une liste séparée, "Programme non-chirurgical" (voir
      // app/bloc/programme-non-operatoire), avec le même traitement mais jamais mélangés ici.
      const data = [...(pretRes.data || []), ...(encoursRes.data || [])]
        .filter(estDateSelectionnee)
        .filter((p: any) => !estServiceNonOperatoire(p.serviceOrigine))

      // Fusionner : associer chaque patient à sa notification (si existe)
      const liste = data.map((p: any) => {
        const notif = notifsData.find((n: any) => n.patientId === p.id || n.patient?.id === p.id)
        return {
          id: p.idDossier || p.id, realId: p.id,
          nom: p.nom,
          prenom: p.prenom,
          sexe: p.sexe || '',
          dateNaissance: p.dateNaissance || null,
          operation: notif?.intervention || p.libelle || 'Non spécifiée',
          typeChirurgie: p.typeChirurgie || '',
          etat: p.niveauUrgence === 'TRES_URGENT' ? 'TRES_URGENT' : p.niveauUrgence === 'URGENT' ? 'URGENT' : 'NORMAL',
          statut: p.statut || '',
          chirurgien: notif?.chirurgien?.nom || notif?.chirurgienNom || p.chirurgien_nom || '',
          dateIntervention: p.dateIntervention || null,
          salle: p.salleOperation || '',
        }
      })

      setPatients(liste)
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      aDejaCharge.current = true
      setLoading(false)
    }
  }

  // Un patient dont l'opération vient d'être traitée (statut avancé depuis un autre onglet, ou
  // page restaurée depuis le cache de navigation) pouvait rester affiché ici — voir
  // useRefetchOnFocus.
  useRefetchOnFocus(charger)
  // Rafraîchissement en temps réel (sans recharger la page) dès qu'une action est traitée,
  // ici ou depuis un autre poste connecté — voir useRefetchOnRealtimeUpdate.
  useRefetchOnRealtimeUpdate(charger)

  // Tous les filtres (urgence, spécialité, recherche nom, sexe, plage horaire) s'appliquent
  // côté client : le paramètre `recherche` du backend ne filtre que l'idDossier
  // (patient-bloc.controller.ts), et /patients/search est un stub qui renvoie toujours [].
  const patientsFiltres = patients.filter(p => {
    if (filtres.statut && p.etat !== filtres.statut) return false
    if (filtres.specialite && p.typeChirurgie !== filtres.specialite) return false
    if (filtres.sexe && p.sexe !== filtres.sexe) return false
    if (filtres.recherche) {
      const q = filtres.recherche.trim().toLowerCase()
      const cible = `${p.nom || ''} ${p.prenom || ''}`.toLowerCase()
      if (q && !cible.includes(q)) return false
    }
    if ((filtres.heureDebut || filtres.heureFin) && p.dateIntervention) {
      const heure = new Date(p.dateIntervention).toTimeString().slice(0, 5)
      if (filtres.heureDebut && heure < filtres.heureDebut) return false
      if (filtres.heureFin && heure > filtres.heureFin) return false
    }
    return true
  })

  const stats = {
    total: patients.length,
    tresUrgent: patients.filter(p => p.etat === 'TRES_URGENT').length,
    urgents: patients.filter(p => p.etat === 'URGENT').length,
    normaux: patients.filter(p => p.etat === 'NORMAL').length,
  }

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface font-headline tracking-tight">
            Programme Opératoire
          </h1>
          <p className="text-on-surface-variant text-sm font-medium mt-1">
            Liste des patients à opérer — {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button type="button" onClick={() => setShowProgrammeAVenir(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition-colors">
          <span className="material-symbols-outlined text-lg">calendar_month</span>
          Voir le programme à venir
        </button>
      </div>

      <PatientStatsCards stats={stats} />
      <PatientFilters
        date={selectedDate}
        onDateChange={setSelectedDate}
        onFilterChange={setFiltres}
      />

      {loading ? (
        <div className="text-center py-12 text-gray-500">🔄 Chargement des patients...</div>
      ) : (
        <PatientsListTable patients={patientsFiltres} />
      )}

      <ProgrammeAVenirModal
        open={showProgrammeAVenir}
        onClose={() => setShowProgrammeAVenir(false)}
        onChoisirDate={setSelectedDate}
      />
    </div>
  )
}
