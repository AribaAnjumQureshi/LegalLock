'use client'

import { useEffect, useState } from 'react'
import { UserCircle } from 'lucide-react'
import { Topbar } from '@/components/topbar'
import { apiFetch, type ApiUser } from '@/lib/api'

export default function ProfilePage() {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/auth/me').then(r => setUser(r.user)).catch(e => setError(e.message))
  }, [])

  return <>
    <Topbar breadcrumb="Home / Profile" title="User Profile" />
    <main className="flex-1 p-6">
      <div className="mx-auto max-w-2xl rounded-md border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4 border-b pb-5">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"><UserCircle className="size-8"/></div>
          <div><h2 className="text-lg font-bold">{user?.username || 'User'}</h2><p className="text-sm text-muted-foreground">{user?.email || 'No email'}</p></div>
        </div>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs uppercase text-muted-foreground">Username</dt><dd className="mt-1 font-medium">{user?.username || '—'}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">Email</dt><dd className="mt-1 font-medium">{user?.email || '—'}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">Full Name</dt><dd className="mt-1 font-medium">{user?.full_name || '—'}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">Role</dt><dd className="mt-1 font-medium capitalize">{user?.role || '—'}</dd></div>
          <div><dt className="text-xs uppercase text-muted-foreground">Account Status</dt><dd className="mt-1 font-medium">{user?.is_active === false ? 'Inactive' : 'Active'}</dd></div>
        </dl>
      </div>
    </main>
  </>
}
