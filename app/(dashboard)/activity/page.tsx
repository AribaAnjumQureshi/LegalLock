'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Topbar } from '@/components/topbar'
import { apiFetch, getStoredUser } from '@/lib/api'

type Activity = {
  id: string | number
  action: string
  target_id?: string
  detail?: any
  ip_address?: string
  created_at: string
  actor_username?: string
  actor_email?: string
  actor_role?: string
}
type RequestItem = {
  id: number
  document_id: string
  access_type: 'read'|'write'
  reason?: string
  status: string
  requester_username: string
  requester_email: string
  document_name: string
  case_id: string
}

export default function ActivityPage() {
  const [entries, setEntries] = useState<Activity[]>([])
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const user = getStoredUser()

  async function load() {
    try {
      const result = await apiFetch('/activity')
      setEntries(result.activity || [])
      setRequests(user?.role === 'admin' ? ((await apiFetch('/access-requests')).requests || []) : ((await apiFetch('/my-access-requests')).requests || []))
    } catch (e: any) { setError(e.message) }
  }
  useEffect(() => { load() }, [])

  async function review(id: number, status: 'approved'|'rejected') {
    try { await apiFetch(`/access-requests/${id}`, { method:'PATCH', body:JSON.stringify({status}) }); await load() }
    catch (e:any) { alert(e.message) }
  }

  const visible = filter === 'all' ? entries : entries.filter(e => filter === 'denied' ? e.action === 'ACCESS_DENIED' : e.action === filter)
  return <>
    <Topbar breadcrumb="Home / Activity" title="System Activity Log" />
    <main className="flex-1 space-y-5 p-6">
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <div className="rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-success"/><div><p className="text-sm font-semibold">Audit trail</p><p className="text-xs text-muted-foreground">Every login, upload, view, download, access request and denial is attributed to the authenticated user.</p></div></div>
      </div>

      {user?.role === 'admin' && <section className="rounded-md border border-border bg-card shadow-sm">
        <div className="border-b px-5 py-3"><h2 className="text-sm font-semibold">{user?.role === 'admin' ? 'Access Requests' : 'My Access Requests'}</h2></div>
        <div className="divide-y">
          {!requests.length && <p className="p-5 text-sm text-muted-foreground">No access requests.</p>}
          {requests.map(r=><div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{r.requester_username} requests {r.access_type} access</p><p className="text-xs text-muted-foreground">{r.document_name} · {r.case_id} · {r.reason || 'No reason provided'}</p></div>
            {r.status==='pending' && user?.role==='admin' ? <div className="flex gap-2"><button onClick={()=>review(r.id,'approved')} className="rounded-sm border px-3 py-1.5 text-xs font-medium text-success">Approve</button><button onClick={()=>review(r.id,'rejected')} className="rounded-sm border px-3 py-1.5 text-xs font-medium text-destructive">Reject</button></div> : <span className="text-xs capitalize text-muted-foreground">{r.status}</span>}
          </div>)}
        </div>
      </section>}

      <section className="rounded-md border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-semibold">Events ({visible.length})</h2>
          <select value={filter} onChange={e=>setFilter(e.target.value)} className="h-8 rounded-sm border px-2 text-xs">
            <option value="all">All</option><option value="LOGIN_SUCCESS">Logins</option><option value="DOCUMENT_UPLOADED">Uploads</option><option value="DOCUMENT_VIEWED">Views</option><option value="DOCUMENT_DOWNLOADED">Downloads</option><option value="ACCESS_REQUESTED">Access Requests</option><option value="denied">Denied</option>
          </select>
        </div>
        <ul className="divide-y">{visible.map(e=><li key={String(e.id)} className="flex flex-wrap gap-3 px-5 py-4">
          <div className="min-w-0 flex-1"><p className="text-sm"><b>{e.actor_username || 'Unknown'}</b> <span className="text-muted-foreground">{e.action}</span> {e.target_id && <code className="text-xs">{e.target_id}</code>}</p><p className="mt-1 text-[11px] text-muted-foreground">{new Date(e.created_at).toLocaleString()} · {e.ip_address || 'IP unavailable'} · {e.actor_email || ''}</p></div>
          <span className="text-xs text-muted-foreground">{e.detail ? JSON.stringify(e.detail) : ''}</span>
        </li>)}</ul>
      </section>
    </main>
  </>
}
