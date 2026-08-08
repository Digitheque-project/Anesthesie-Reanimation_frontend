import { NextRequest, NextResponse } from 'next/server'

// Port de front-clinique/src/app/api/users/[id]/route.ts.
// Proxy serveur vers le service « utilisateurs » (annuaire) : le gateway ne renvoie pas
// d'en-tête Access-Control-Allow-Origin pour nos origines, d'où le relais côté serveur
// (aucune contrainte CORS entre serveurs), en propageant le token de l'utilisateur.
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authorization = request.headers.get('authorization')
  if (!authorization) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const cleanId = id?.trim()
  if (!cleanId) {
    return NextResponse.json({ message: 'Missing user id.' }, { status: 400 })
  }

  const base = (process.env.USER_SERVICE_API_URL || process.env.NEXT_PUBLIC_USER_SERVICE_API_URL || '')
    .trim()
    .replace(/\/+$/, '')
  if (!base) {
    return NextResponse.json({ message: 'User service URL non configuré.' }, { status: 500 })
  }

  try {
    const upstream = await fetch(`${base}/${encodeURIComponent(cleanId)}`, {
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      cache: 'no-store',
    })

    if (upstream.status === 404) {
      // Utilisateur absent de l'annuaire : cas ATTENDU (ex. prescripteurId non référencé).
      // On renvoie 200 + null plutôt que de propager le 404.
      return NextResponse.json(null)
    }

    if (!upstream.ok) {
      return NextResponse.json({ message: 'Utilisateur introuvable.' }, { status: upstream.status })
    }

    const data = await upstream.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ message: 'Failed to load user.' }, { status: 502 })
  }
}
