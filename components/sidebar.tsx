'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, Upload, ScrollText, LogOut, UserCircle } from 'lucide-react'
import { Seal } from '@/components/seal'
import { cn } from '@/lib/utils'
import { getStoredUser, clearSession, type ApiUser } from '@/lib/api'
import { useEffect, useState } from 'react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/activity', label: 'Activity Log', icon: ScrollText },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<ApiUser | null>(null)

  useEffect(() => setUser(getStoredUser()), [])

  function signOut() {
    clearSession()
    router.replace('/')
  }

  const initials = user?.username?.slice(0, 2).toUpperCase() || 'LL'

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <Seal className="size-8 text-sidebar-primary" />
        <div className="leading-tight">
          <p className="text-sm font-bold text-sidebar-accent-foreground">LegalLock</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Secure Portal</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/50">Navigation</p>
        <ul className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return <li key={item.href}>
              <Link href={item.href} className={cn(
                'flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              )}>
                <span className={cn('-ml-3 h-5 w-0.5 rounded-full', active ? 'bg-sidebar-primary' : 'bg-transparent')} aria-hidden />
                <Icon className="size-4" aria-hidden />{item.label}
              </Link>
            </li>
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link href="/profile" className="block rounded-sm bg-sidebar-accent/50 p-3 hover:bg-sidebar-accent">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-sidebar-primary font-mono text-sm font-bold text-sidebar-primary-foreground">{initials}</div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{user?.username || 'User'}</p>
              <p className="truncate font-mono text-[10px] text-sidebar-foreground/60">{user?.email || 'No email'}</p>
            </div>
            <UserCircle className="size-4 text-sidebar-foreground/60" />
          </div>
        </Link>
        <button type="button" onClick={signOut}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-sm px-3 py-2 text-xs font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground">
          <LogOut className="size-3.5" aria-hidden />Sign out
        </button>
      </div>
    </aside>
  )
}
