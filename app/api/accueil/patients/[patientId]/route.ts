import { NextRequest, NextResponse } from 'next/server'
import { decoderToken } from '@/lib/auth/central-session'

// Port de front-clinique/src/app/api/accueil/patients/[patientId]/route.ts.
// URL du back "accueil" côté SERVEUR (pas d'appel navigateur -> pas de CORS).
const ACCUEIL_API_URL = (
  process.env.ACCUEIL_API_URL ||
  process.env.NEXT_PUBLIC_ACCUEIL_API_URL ||
  ''
).replace(/\/+$/, '')

interface AccueilPatient {
  id: string
  [key: string]: unknown
}

// Petit cache en mémoire de la LISTE des patients par chuId, pour éviter de rappeler la
// liste complète à chaque recherche (dossier patient, notifications, ...).
const LIST_TTL_MS = 15_000
const listCache = new Map<string, { at: number; patients: AccueilPatient[] }>()

async function fetchPatientList(chuId: string, authorization: string): Promise<AccueilPatient[] | null> {
  const cached = listCache.get(chuId)
  if (cached && Date.now() - cached.at < LIST_TTL_MS) return cached.patients

  const url = `${ACCUEIL_API_URL}/patients?chuId=${encodeURIComponent(chuId)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: authorization, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) return null

  const data = (await res.json()) as unknown
  const patients = Array.isArray(data) ? (data as AccueilPatient[]) : []
  listCache.set(chuId, { at: Date.now(), patients })
  return patients
}

/**
 * Proxy serveur -> back "accueil" pour récupérer un patient (évite le CORS qu'un appel
 * direct depuis le navigateur déclencherait). Tente d'abord GET /patients/:id, puis se
 * rabat sur la liste complète du CHU si l'id direct échoue.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await context.params

  const authorization = request.headers.get('authorization')
  if (!authorization) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!ACCUEIL_API_URL) {
    return NextResponse.json({ message: 'ACCUEIL_API_URL non configuré.' }, { status: 502 })
  }

  const { searchParams } = new URL(request.url)
  const token = authorization.replace(/^Bearer\s+/i, '')
  const chuId = searchParams.get('chuId') || decoderToken(token)?.services?.[0]?.chu?.id || null

  if (!chuId) {
    return NextResponse.json({ message: 'Contexte CHU introuvable (chuId manquant).' }, { status: 400 })
  }

  // 1) Tentative directe par id (chemin rapide si la route by-id fonctionne).
  try {
    const byIdUrl = `${ACCUEIL_API_URL}/patients/${encodeURIComponent(patientId)}?chuId=${encodeURIComponent(chuId)}`
    const direct = await fetch(byIdUrl, {
      method: 'GET',
      headers: { Authorization: authorization, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (direct.ok) {
      const text = await direct.text()
      const trimmed = text.trim()
      if (trimmed && trimmed !== 'null' && trimmed !== '{}') {
        return new NextResponse(text, {
          status: 200,
          headers: { 'Content-Type': direct.headers.get('content-type') || 'application/json' },
        })
      }
    }
  } catch (error) {
    console.warn(`accueil by-id KO pour ${patientId}, repli sur la liste`, error)
  }

  // 2) Repli : liste complète du CHU puis recherche par id.
  try {
    const patients = await fetchPatientList(chuId, authorization)
    if (!patients) {
      return NextResponse.json({ message: 'Service accueil injoignable.' }, { status: 502 })
    }

    const found = patients.find((p) => p?.id === patientId)
    if (found) return NextResponse.json(found, { status: 200 })

    return NextResponse.json(
      { message: `Patient ${patientId} introuvable pour ce CHU.`, chuId, patientsCount: patients.length },
      { status: 404 },
    )
  } catch (error) {
    console.error(`Proxy accueil /patients/${patientId} a échoué:`, error)
    return NextResponse.json({ message: 'Service accueil injoignable.' }, { status: 502 })
  }
}
