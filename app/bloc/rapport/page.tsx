'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
export default function RapportRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/bloc/rapports') }, [])
  return <div className="ml-64 p-8">Redirection...</div>
}
