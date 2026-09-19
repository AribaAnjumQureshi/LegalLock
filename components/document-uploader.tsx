'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { UploadCloud, FileText, X, ShieldCheck, CheckCircle2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

const fieldClass = 'h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25'
const docTypes = ['Evidence','Report','Warrant','Statement','Affidavit']
const classifications = ['Unclassified','Restricted','Confidential']
const statuses = ['Sealed','In Review','Released','Archived']

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024**2) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/1024**2).toFixed(1)} MB`
}

export function DocumentUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [caseId, setCaseId] = useState('')
  const [docType, setDocType] = useState('')
  const [classification, setClassification] = useState('Restricted')
  const [status, setStatus] = useState('In Review')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => {}, [])

  const addFile = useCallback((list: FileList | null) => {
    const next = list?.[0]
    if (!next) return
    setFile(next); setComplete(false); setError('')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !caseId || !docType) return
    setUploading(true); setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('caseId', caseId)
      form.append('docType', docType)
      form.append('classification', classification)
      form.append('status', status)
      form.append('description', description)
      await apiFetch('/documents', { method: 'POST', body: form })
      setComplete(true)
    } catch (e: any) { setError(e.message) } finally { setUploading(false) }
  }

  function reset() {
    setFile(null); setCaseId(''); setDocType(''); setClassification('Restricted'); setStatus('In Review'); setDescription(''); setComplete(false); setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b bg-secondary/50 px-5 py-3">
        <div className="flex items-center gap-2"><Lock className="size-4 text-primary"/><h2 className="text-sm font-semibold">Secure Document Upload</h2></div>
        <span className="rounded-sm bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-gold-foreground">Restricted</span>
      </div>
      <div className="space-y-5 p-5">
        <div onClick={()=>!uploading && inputRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addFile(e.dataTransfer.files)}} role="button" tabIndex={0}
          className={cn('flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-6 py-10 text-center', uploading && 'pointer-events-none opacity-60')}>
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><UploadCloud className="size-6"/></span>
          <p className="mt-3 text-sm font-semibold">Drag & drop a file here</p>
          <p className="mt-1 text-xs text-muted-foreground">or click to browse · PDF, JPG, PNG, DOCX · Max 500 MB</p>
          <input ref={inputRef} type="file" className="sr-only" onChange={e=>addFile(e.target.files)}/>
        </div>

        {file && <div className="flex items-center gap-3 rounded-md border p-3">
          <FileText className="size-5 text-muted-foreground"/>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{formatSize(file.size)}</p></div>
          {!uploading && !complete && <button type="button" onClick={()=>setFile(null)}><X className="size-4"/></button>}
        </div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><label className="text-[11px] font-semibold uppercase text-muted-foreground">Case ID *</label><input required value={caseId} onChange={e=>setCaseId(e.target.value)} placeholder="CR-2026-0417" className={fieldClass}/></div>
          <div><label className="text-[11px] font-semibold uppercase text-muted-foreground">Document Type *</label><select required value={docType} onChange={e=>setDocType(e.target.value)} className={fieldClass}><option value="">Select type</option>{docTypes.map(x=><option key={x}>{x}</option>)}</select></div>
          <div><label className="text-[11px] font-semibold uppercase text-muted-foreground">Classification</label><select value={classification} onChange={e=>setClassification(e.target.value)} className={fieldClass}>{classifications.map(x=><option key={x}>{x}</option>)}</select></div>
          <div><label className="text-[11px] font-semibold uppercase text-muted-foreground">Status</label><select value={status} onChange={e=>setStatus(e.target.value)} className={fieldClass}>{statuses.map(x=><option key={x}>{x}</option>)}</select></div>
        </div>

        <div><label className="text-[11px] font-semibold uppercase text-muted-foreground">Description</label><textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm outline-none" /></div>

        {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        {complete && <div className="flex items-center gap-3 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"><CheckCircle2 className="size-5"/><span><b>Upload complete.</b> The document and version 1 were recorded.</span></div>}
        <div className="flex items-center gap-2 rounded-sm bg-muted/60 px-3 py-2.5 text-[11px] text-muted-foreground"><ShieldCheck className="size-4 text-primary"/>SHA-256 is calculated on the server and recorded with the document.</div>

        {complete ? <Button type="button" onClick={reset} className="w-full rounded-sm">Upload Another</Button> :
          <Button type="submit" disabled={!file || !caseId || !docType || uploading} className="w-full rounded-sm">{uploading ? 'Uploading…' : 'Upload to Custody'}</Button>}
      </div>
    </form>
  )
}
