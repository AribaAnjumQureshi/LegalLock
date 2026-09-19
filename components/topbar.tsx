'use client'

import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getStoredUser, type ApiUser } from '@/lib/api'

export function Topbar({ title, breadcrumb }: { title: string; breadcrumb: string }) {
  const [user, setUser] = useState<ApiUser | null>(null)

  useEffect(() => {
    setUser(getStoredUser())
    const onStorage = () => setUser(getStoredUser())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <>
      <div className="flex items-center justify-center bg-primary px-4 py-1 text-[10px] font-semibold uppercase text-primary-foreground">
        Official Use Only
      </div>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-6 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{breadcrumb}</p>
          <h1 className="truncate text-lg font-bold tracking-tight text-foreground">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Notifications"
            className="relative flex size-9 items-center justify-center rounded-sm border border-input bg-background text-muted-foreground hover:text-foreground">
            <Bell className="size-4" aria-hidden />
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" aria-hidden />
          </button>
          <div className="border-l border-border pl-3">
            <p className="text-sm font-semibold text-foreground">{user?.username || 'User'}</p>
          </div>
        </div>
      </header>
    </>
  )
}
