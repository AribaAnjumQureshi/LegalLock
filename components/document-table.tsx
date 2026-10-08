'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Download,
  Eye,
  FileText,
  Lock,
  ShieldCheck,
  Share2,
  Check,
  X,
  Clock,
} from 'lucide-react'
import { ClassificationBadge } from '@/components/badges'
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
  uploaded_by_name?: string
  can_read: boolean
  can_write: boolean
}

type AccessRequest = {
  id: number
  document_id: string
  requester_id: string
  access_type: 'read' | 'write'
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  document_name: string
  requester_username: string
  requester_name: string
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

  // Access request form
  const [requestDocument, setRequestDocument] =
    useState<ApiDocument | null>(null)

  const [requestType, setRequestType] =
    useState<'read' | 'write'>('read')

  const [requestReason, setRequestReason] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)

  // Pending requests
  const [pendingRequests, setPendingRequests] =
    useState<AccessRequest[]>([])

  const [pendingLoading, setPendingLoading] = useState(false)

  // Approve/reject loading
  const [processingRequest, setProcessingRequest] =
    useState<number | null>(null)

  // ============================================================
  // LOAD DOCUMENTS
  // ============================================================

  async function loadDocuments() {
    try {
      setLoading(true)

      const result = await apiFetch('/documents')

      setData(result.documents || [])
      setError('')
    } catch (e: any) {
      setError(e.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // LOAD PENDING ACCESS REQUESTS
  // ============================================================

  async function loadPendingRequests() {
    try {
      setPendingLoading(true)

      const result = await apiFetch(
        '/documents/access-requests/pending',
      )

      setPendingRequests(result.requests || [])
    } catch (e: any) {
      // Normal users may not have permission to view pending requests.
      // Do not show this as a page-level error.
      console.log(
        'Pending access requests unavailable:',
        e.message,
      )
    } finally {
      setPendingLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
    loadPendingRequests()
  }, [])

  // ============================================================
  // FILTERS
  // ============================================================

  const cases = useMemo(
    () =>
      Array.from(
        new Set(data.map((d) => d.case_id)),
      ).sort(),
    [data],
  )

  const filtered = useMemo(
    () =>
      data.filter(
        (d) =>
          (caseFilter === 'all' ||
            d.case_id === caseFilter) &&
          (typeFilter === 'all' ||
            d.doc_type === typeFilter) &&
          (statusFilter === 'all' ||
            d.status === statusFilter),
      ),
    [
      data,
      caseFilter,
      typeFilter,
      statusFilter,
    ],
  )

  // ============================================================
  // OPEN ACCESS REQUEST MODAL
  // ============================================================

  function openRequestModal(
    doc: ApiDocument,
    accessType: 'read' | 'write',
  ) {
    setRequestDocument(doc)
    setRequestType(accessType)
    setRequestReason('')
  }

  function closeRequestModal() {
    if (requestLoading) return

    setRequestDocument(null)
    setRequestReason('')
    setRequestType('read')
  }

  // ============================================================
  // SUBMIT ACCESS REQUEST
  // ============================================================

  async function submitAccessRequest() {
    if (!requestDocument) return

    if (!requestReason.trim()) {
      alert('Please enter a reason for the access request.')
      return
    }

    try {
      setRequestLoading(true)

      await apiFetch(
        `/documents/${requestDocument.id}/access-request`,
        {
          method: 'POST',
          body: JSON.stringify({
            accessType: requestType,
            reason: requestReason.trim(),
          }),
        },
      )

      alert(
        `${requestType === 'read' ? 'Read' : 'Write'} access request submitted successfully.`,
      )

      closeRequestModal()

      await loadDocuments()
    } catch (e: any) {
      alert(
        e.message ||
          'Failed to submit access request',
      )
    } finally {
      setRequestLoading(false)
    }
  }

  // ============================================================
  // VIEW DOCUMENT
  // ============================================================

  async function view(doc: ApiDocument) {
    if (!doc.can_read) {
      openRequestModal(doc, 'read')
      return
    }

    try {
      const result = await apiFetch(
        `/documents/${doc.id}`,
      )

      alert(
        `Document: ${result.document.name}\n\n` +
          `Case ID: ${result.document.case_id}\n` +
          `Type: ${result.document.doc_type}\n` +
          `Classification: ${result.document.classification}\n` +
          `SHA-256: ${result.document.sha256_hash}`,
      )
    } catch (e: any) {
      alert(e.message)
    }
  }

  // ============================================================
  // VERSION HISTORY
  // ============================================================

  async function versions(doc: ApiDocument) {
    if (!doc.can_read) {
      openRequestModal(doc, 'read')
      return
    }

    try {
      const result = await apiFetch(
        `/documents/${doc.id}/versions`,
      )

      const list = result.versions || []

      alert(
        list.length
          ? list
              .map(
                (v: any) =>
                  `Version ${v.version_number} · ` +
                  `${v.created_by_username} · ` +
                  `${new Date(
                    v.created_at,
                  ).toLocaleString()} · ` +
                  `${v.sha256_hash}`,
              )
              .join('\n')
          : 'No versions found',
      )
    } catch (e: any) {
      alert(e.message)
    }
  }

  // ============================================================
  // DOWNLOAD
  // ============================================================

  async function download(doc: ApiDocument) {
    if (!doc.can_read) {
      openRequestModal(doc, 'read')
      return
    }

    try {
      const token =
        localStorage.getItem(
          'legalLockToken',
        )

      const base =
        process.env.NEXT_PUBLIC_API_URL ||
        'http://localhost:4000/api'

      const response = await fetch(
        `${base}/documents/${doc.id}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        let message = 'Download failed'

        try {
          const result = await response.json()
          message = result.error || message
        } catch {}

        throw new Error(message)
      }

      const blob = await response.blob()

      const url =
        URL.createObjectURL(blob)

      const a =
        document.createElement('a')

      a.href = url
      a.download = doc.name

      document.body.appendChild(a)
      a.click()
      a.remove()

      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert(e.message)
    }
  }

  // ============================================================
  // APPROVE / REJECT ACCESS REQUEST
  // ============================================================

  async function reviewRequest(
    requestId: number,
    decision: 'approved' | 'rejected',
  ) {
    const message =
      decision === 'approved'
        ? 'Approve this access request?'
        : 'Reject this access request?'

    if (!window.confirm(message)) {
      return
    }

    try {
      setProcessingRequest(requestId)

      await apiFetch(
        `/documents/access-requests/${requestId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            decision,
          }),
        },
      )

      alert(
        decision === 'approved'
          ? 'Access request approved.'
          : 'Access request rejected.',
      )

      await loadPendingRequests()
      await loadDocuments()
    } catch (e: any) {
      alert(
        e.message ||
          'Failed to update access request',
      )
    } finally {
      setProcessingRequest(null)
    }
  }

  return (
    <div className="space-y-6">

      {/* ======================================================
          SHARING / ACCESS REQUEST PANEL
      ======================================================= */}

      <div className="rounded-md border border-border bg-card shadow-sm">

        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <Share2 className="size-4" />

              <h2 className="text-sm font-semibold">
                System Security Sharing
              </h2>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Request access to documents and manage
              permissions for your documents.
            </p>
          </div>

          <div className="rounded-full border px-3 py-1 text-xs">
            {pendingRequests.length} pending
          </div>
        </div>

        <div className="p-4">

          {pendingLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading access requests…
            </p>
          ) : pendingRequests.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <Clock className="mx-auto mb-2 size-5 text-muted-foreground" />

              <p className="text-sm font-medium">
                No pending access requests
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Requests for your documents will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">

              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-md border bg-muted/20 p-4"
                >

                  <div className="flex flex-wrap items-start justify-between gap-4">

                    <div className="min-w-0">

                      <div className="flex items-center gap-2">
                        <FileText className="size-4" />

                        <p className="font-medium">
                          {request.document_name}
                        </p>
                      </div>

                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">

                        <p>
                          <span className="font-medium text-foreground">
                            Requester:
                          </span>{' '}
                          {request.requester_name ||
                            request.requester_username}
                        </p>

                        <p>
                          <span className="font-medium text-foreground">
                            Permission:
                          </span>{' '}
                          {request.access_type === 'write'
                            ? 'Read + Write'
                            : 'Read only'}
                        </p>

                        {request.reason && (
                          <p>
                            <span className="font-medium text-foreground">
                              Reason:
                            </span>{' '}
                            {request.reason}
                          </p>
                        )}

                        <p>
                          <span className="font-medium text-foreground">
                            Requested:
                          </span>{' '}
                          {new Date(
                            request.created_at,
                          ).toLocaleString()}
                        </p>

                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">

                      <button
                        disabled={
                          processingRequest ===
                          request.id
                        }
                        onClick={() =>
                          reviewRequest(
                            request.id,
                            'approved',
                          )
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-success/30 bg-success/10 px-3 text-xs font-medium text-success hover:bg-success/20 disabled:opacity-50"
                      >
                        <Check className="size-3.5" />

                        Approve
                      </button>

                      <button
                        disabled={
                          processingRequest ===
                          request.id
                        }
                        onClick={() =>
                          reviewRequest(
                            request.id,
                            'rejected',
                          )
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-destructive/30 bg-destructive/10 px-3 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                      >
                        <X className="size-3.5" />

                        Reject
                      </button>

                    </div>

                  </div>
                </div>
              ))}

            </div>
          )}

        </div>
      </div>

      {/* ======================================================
          DOCUMENT FILTERS
      ======================================================= */}

      <div className="rounded-md border border-border bg-card p-4 shadow-sm">

        <div className="flex flex-wrap items-end gap-3">

          <div>
            <label className="text-[11px] font-semibold uppercase text-muted-foreground">
              Case ID
            </label>

            <select
              value={caseFilter}
              onChange={(e) =>
                setCaseFilter(e.target.value)
              }
              className="mt-1 h-9 rounded-sm border border-input bg-background px-2.5 text-sm"
            >
              <option value="all">
                All cases
              </option>

              {cases.map((c) => (
                <option key={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase text-muted-foreground">
              Type
            </label>

            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value)
              }
              className="mt-1 h-9 rounded-sm border border-input bg-background px-2.5 text-sm"
            >
              <option value="all">
                All types
              </option>

              {[
                'Evidence',
                'Report',
                'Warrant',
                'Statement',
                'Affidavit',
              ].map((t) => (
                <option key={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase text-muted-foreground">
              Status
            </label>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="mt-1 h-9 rounded-sm border border-input bg-background px-2.5 text-sm"
            >
              <option value="all">
                All statuses
              </option>

              {[
                'Sealed',
                'In Review',
                'Released',
                'Archived',
              ].map((t) => (
                <option key={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {data.length} records
          </span>

        </div>
      </div>

      {/* ======================================================
          ERROR
      ======================================================= */}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ======================================================
          DOCUMENT TABLE
      ======================================================= */}

      <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">

        <table className="w-full min-w-[1050px] border-collapse text-sm">

          <thead>
            <tr className="border-b bg-muted/50 text-left">

              {[
                'Document Name',
                'Case ID',
                'Type',
                'Uploaded By',
                'Date',
                'Access',
                'Actions',
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-foreground"
                >
                  {h}
                </th>
              ))}

            </tr>
          </thead>

          <tbody>

            {!loading &&
              filtered.map((d) => (
                <tr
                  key={d.id}
                  className="border-b last:border-0 hover:bg-muted/40"
                >

                  {/* DOCUMENT */}

                  <td className="px-4 py-3">

                    <div className="flex items-center gap-2.5">

                      <span className="flex size-8 items-center justify-center rounded-sm border bg-muted/60">

                        {d.status === 'Sealed' ? (
                          <Lock className="size-4 text-destructive" />
                        ) : (
                          <FileText className="size-4" />
                        )}

                      </span>

                      <div className="min-w-0">

                        <p className="truncate font-medium">
                          {d.name}
                        </p>

                        <p className="font-mono text-[11px] text-muted-foreground">
                          {d.id} ·{' '}
                          {formatSize(
                            Number(d.file_size),
                          )}{' '}
                          · {d.status}
                        </p>

                      </div>

                      <ClassificationBadge
                        level={
                          d.classification as any
                        }
                      />

                    </div>

                  </td>

                  {/* CASE */}

                  <td className="px-4 py-3 font-mono text-xs">
                    {d.case_id}
                  </td>

                  {/* TYPE */}

                  <td className="px-4 py-3 text-muted-foreground">
                    {d.doc_type}
                  </td>

                  {/* UPLOADED BY */}

                  <td className="px-4 py-3">
                    {d.uploaded_by_username}
                  </td>

                  {/* DATE */}

                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                    {new Date(
                      d.updated_at ||
                        d.created_at,
                    ).toLocaleString()}
                  </td>

                  {/* ACCESS */}

                  <td className="px-4 py-3">

                    {d.can_read ? (
                      <div className="flex flex-col gap-1">

                        <span className="text-xs font-medium text-success">
                          Read
                        </span>

                        {d.can_write && (
                          <span className="text-[11px] text-primary">
                            Write
                          </span>
                        )}

                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          openRequestModal(
                            d,
                            'read',
                          )
                        }
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Share2 className="size-3.5" />

                        Request access
                      </button>
                    )}

                  </td>

                  {/* ACTIONS */}

                  <td className="px-4 py-3">

                    <div className="flex flex-wrap justify-end gap-1.5">

                      <button
                        onClick={() =>
                          view(d)
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs hover:bg-muted"
                      >
                        <Eye className="size-3.5" />

                        View
                      </button>

                      <button
                        onClick={() =>
                          download(d)
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs hover:bg-muted"
                      >
                        <Download className="size-3.5" />

                        Download
                      </button>

                      <button
                        onClick={() =>
                          versions(d)
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs hover:bg-muted"
                      >
                        Versions
                      </button>

                      {!d.can_write && (
                        <button
                          onClick={() =>
                            openRequestModal(
                              d,
                              'write',
                            )
                          }
                          className="inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs hover:bg-muted"
                        >
                          <ShieldCheck className="size-3.5" />

                          Request write
                        </button>
                      )}

                    </div>

                  </td>

                </tr>
              ))}

          </tbody>

        </table>

        {loading && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Loading documents…
          </p>
        )}

        {!loading &&
          !filtered.length && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No documents found.
            </p>
          )}

      </div>

      {/* ======================================================
          ACCESS REQUEST MODAL
      ======================================================= */}

      {requestDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl">

            {/* HEADER */}

            <div className="border-b p-4">

              <div className="flex items-center gap-2">

                <Share2 className="size-5" />

                <h2 className="font-semibold">
                  Request Document Access
                </h2>

              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Ask the document owner to grant you
                permission.
              </p>

            </div>

            {/* BODY */}

            <div className="space-y-4 p-4">

              <div className="rounded-md border bg-muted/30 p-3">

                <p className="text-sm font-medium">
                  {requestDocument.name}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Case: {requestDocument.case_id}
                </p>

                <p className="text-xs text-muted-foreground">
                  Owner:{' '}
                  {requestDocument.uploaded_by_username}
                </p>

              </div>

              {/* ACCESS TYPE */}

              <div>

                <label className="text-xs font-semibold">
                  Requested permission
                </label>

                <div className="mt-2 grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      setRequestType('read')
                    }
                    className={`rounded-md border p-3 text-left ${
                      requestType === 'read'
                        ? 'border-primary bg-primary/10'
                        : 'border-border'
                    }`}
                  >

                    <p className="text-sm font-medium">
                      Read
                    </p>

                    <p className="mt-1 text-[11px] text-muted-foreground">
                      View, download and inspect
                      the document.
                    </p>

                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setRequestType('write')
                    }
                    className={`rounded-md border p-3 text-left ${
                      requestType === 'write'
                        ? 'border-primary bg-primary/10'
                        : 'border-border'
                    }`}
                  >

                    <p className="text-sm font-medium">
                      Write
                    </p>

                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Read access plus permission
                      to create versions.
                    </p>

                  </button>

                </div>

              </div>

              {/* REASON */}

              <div>

                <label className="text-xs font-semibold">
                  Reason
                </label>

                <textarea
                  value={requestReason}
                  onChange={(e) =>
                    setRequestReason(
                      e.target.value,
                    )
                  }
                  placeholder="Explain why you need access..."
                  rows={4}
                  className="mt-2 w-full resize-none rounded-md border border-input bg-background p-3 text-sm outline-none focus:border-primary"
                />

              </div>

            </div>

            {/* FOOTER */}

            <div className="flex justify-end gap-2 border-t p-4">

              <button
                type="button"
                onClick={closeRequestModal}
                disabled={requestLoading}
                className="h-9 rounded-md border px-4 text-sm hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={submitAccessRequest}
                disabled={
                  requestLoading ||
                  !requestReason.trim()
                }
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >

                <Share2 className="size-4" />

                {requestLoading
                  ? 'Sending…'
                  : 'Send Request'}

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  )
}