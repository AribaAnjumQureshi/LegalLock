'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser } from '@/lib/api'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!getStoredUser()) router.replace('/')
    else setReady(true)
  }, [router])
  if (!ready) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading LegalLock…</div>
  return <>{children}</>
}
