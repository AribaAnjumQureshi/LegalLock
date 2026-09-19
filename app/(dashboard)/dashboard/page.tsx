'use client'

import Link from 'next/link'
import { FileText, ShieldCheck, Clock, AlertTriangle, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Topbar } from '@/components/topbar'
import { StatCard } from '@/components/stat-card'
import { ClassificationBadge, ResultBadge } from '@/components/badges'
import { apiFetch } from '@/lib/api'

type DashboardData = {
  stats: { total_documents: number; sealed_confidential: number; pending_review: number; access_denied: number }
  recent: Array<{ id:string; name:string; case_id:string; classification:string; updated_at:string }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/dashboard').then(setData).catch((e) => setError(e.message))
  }, [])

  const stats = data?.stats
  return (
    <>
      <Topbar breadcrumb="Home / Dashboard" title="Dashboard" />
      <main className="flex-1 space-y-6 p-6">
        {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Documents" value={String(stats?.total_documents ?? 0)} sub="Documents in registry" icon={FileText} accent="primary" />
          <StatCard label="Sealed / Confidential" value={String(stats?.sealed_confidential ?? 0)} sub="Protected records" icon={ShieldCheck} accent="destructive" />
          <StatCard label="Pending Review" value={String(stats?.pending_review ?? 0)} sub="Awaiting review" icon={Clock} accent="gold" />
          <StatCard label="Access Denied" value={String(stats?.access_denied ?? 0)} sub="Denied requests in 24h" icon={AlertTriangle} accent="destructive" />
        </section>

        <section>
          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold text-foreground">Recent Documents</h2>
              <Link href="/documents" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                View all <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
            {data?.recent?.length ? <ul className="divide-y divide-border">
              {data.recent.map((doc) => (
                <li key={doc.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground"><FileText className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{doc.id} · {doc.case_id}</p>
                  </div>
                  <ClassificationBadge level={doc.classification as any} className="hidden sm:inline-flex" />
                </li>
              ))}
            </ul> : <p className="p-8 text-center text-sm text-muted-foreground">No documents have been uploaded yet.</p>}
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Secure access workflow</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Document read/write access is enforced by the API. If you do not have permission, submit a request and an administrator must approve it.
          </p>
        </section>
      </main>
    </>
  )
}
