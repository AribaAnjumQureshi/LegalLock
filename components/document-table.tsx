'use client'

import { useEffect, useMemo, useState } from 'react'
import { Filter, Download, Eye, Lock, FileText, ShieldCheck } from 'lucide-react'
import { ClassificationBadge, RoleBadge } from '@/components/badges'
import { apiFetch } from '@/lib/api'

type ApiDocument = {
  id: string
  name: string
  case_id: string
  doc_type: string
  description?: string
  mime_type: string
  file_size: number
  sha256_hash: string
  classification: string
  status: string
  created_at: string
  updated_at: string
  uploaded_by_username: string
  can_read: boolean
  can_write: boolean
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

export function DocumentTable() {
  const [data, setData] = useState<ApiDocument[]>([])
  const [caseFilter, setCaseFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    try {
      setLoading(true)
      setData((await apiFetch('/documents')).documents)
      setError('')
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const cases = useMemo(() => Array.from(new Set(data.map(d => d.case_id))).sort(), [data])
  const filtered = useMemo(() => data.filter(d =>
    (caseFilter === 'all' || d.case_id === caseFilter) &&
    (typeFilter === 'all' || d.doc_type === typeFilter) &&
    (statusFilter === 'all' || d.status === statusFilter)
  ), [data, caseFilter, typeFilter, statusFilter])

  async function requestAccess(id: string, accessType: 'read' | 'write') {
    const reason = window.prompt(`Why do you need ${accessType} access?`) || ''
    if (!reason.trim()) return
    try {
      await apiFetch(`/documents/${id}/access-request`, {
        method: 'POST', body: JSON.stringify({ accessType, reason }),
      })
      alert('Access request submitted to an administrator.')
    } catch (e: any) { alert(e.message) }
  }

  async function view(doc: ApiDocument) {
    if (!doc.can_read) return requestAccess(doc.id, 'read')
    try {
      const result = await apiFetch(`/documents/${doc.id}`)
      alert(`Document: ${result.document.name}\nSHA-256: ${result.document.sha256_hash}`)
    } catch (e: any) { alert(e.message) }
  }

  async function versions(doc: ApiDocument) {
    if (!doc.can_read) return requestAccess(doc.id, 'read')
    try {
      const result = await apiFetch(`/documents/${doc.id}/versions`)
      const list = result.versions || []
      alert(list.length
        ? list.map((v: any) => `Version ${v.version_number} · ${v.created_by_username} · ${new Date(v.created_at).toLocaleString()} · ${v.sha256_hash}`).join('\n')
        : 'No versions found')
    } catch (e: any) { alert(e.message) }
  }

  async function download(doc: ApiDocument) {
    if (!doc.can_read) return requestAccess(doc.id, 'read')
    try {
      const token = localStorage.getItem('legalLockToken')
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
      const response = await fetch(`${base}/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error((await response.json()).error || 'Download failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = doc.name; a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) { alert(e.message) }
  }

  return <div className="space-y-4">
    <div className="rounded-md border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div><label className="text-[11px] font-semibold uppercase text-muted-foreground">Case ID</label>
          <select value={caseFilter} onChange={e=>setCaseFilter(e.target.value)} className="mt-1 h-9 rounded-sm border border-input bg-background px-2.5 text-sm">
            <option value="all">All cases</option>{cases.map(c=><option key={c}>{c}</option>)}
          </select></div>
        <div><label className="text-[11px] font-semibold uppercase text-muted-foreground">Type</label>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="mt-1 h-9 rounded-sm border border-input bg-background px-2.5 text-sm">
            <option value="all">All types</option>{['Evidence','Report','Warrant','Statement','Affidavit'].map(t=><option key={t}>{t}</option>)}
          </select></div>
        <div><label className="text-[11px] font-semibold uppercase text-muted-foreground">Status</label>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="mt-1 h-9 rounded-sm border border-input bg-background px-2.5 text-sm">
            <option value="all">All statuses</option>{['Sealed','In Review','Released','Archived'].map(t=><option key={t}>{t}</option>)}
          </select></div>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {data.length} records</span>
      </div>
    </div>

    {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
    <div className="rounded-md border border-border bg-card shadow-sm overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead><tr className="border-b bg-muted/50 text-left">
          {['Document Name','Case ID','Type','Uploaded By','Date','Access','Actions'].map(h=><th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-foreground">{h}</th>)}
        </tr></thead>
        <tbody>
          {!loading && filtered.map(d=><tr key={d.id} className="border-b last:border-0 hover:bg-muted/40">
            <td className="px-4 py-3"><div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-sm border bg-muted/60">{d.status==='Sealed'?<Lock className="size-4 text-destructive"/>:<FileText className="size-4"/>}</span>
              <div className="min-w-0"><p className="truncate font-medium">{d.name}</p><p className="font-mono text-[11px] text-muted-foreground">{d.id} · {formatSize(Number(d.file_size))} · {d.status}</p></div>
              <ClassificationBadge level={d.classification as any}/>
            </div></td>
            <td className="px-4 py-3 font-mono text-xs">{d.case_id}</td>
            <td className="px-4 py-3 text-muted-foreground">{d.doc_type}</td>
            <td className="px-4 py-3"><div className="flex items-center gap-2"><span>{d.uploaded_by_username}</span></div></td>
            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{new Date(d.updated_at || d.created_at).toLocaleString()}</td>
            <td className="px-4 py-3">{d.can_read ? <span className="text-xs text-success">Read</span> : <button onClick={()=>requestAccess(d.id,'read')} className="text-xs font-medium text-primary hover:underline">Request read</button>}</td>
            <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
              <button onClick={()=>view(d)} className="inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs"><Eye className="size-3.5"/>View</button>
              <button onClick={()=>download(d)} className="inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs"><Download className="size-3.5"/>Download</button><button onClick={()=>versions(d)} className="inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs">Versions</button>
              {!d.can_write && <button onClick={()=>requestAccess(d.id,'write')} className="inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs"><ShieldCheck className="size-3.5"/>Request write</button>}
            </div></td>
          </tr>)}
        </tbody>
      </table>
      {loading && <p className="p-8 text-center text-sm text-muted-foreground">Loading documents…</p>}
      {!loading && !filtered.length && <p className="p-8 text-center text-sm text-muted-foreground">No documents found.</p>}
    </div>
  </div>
}
