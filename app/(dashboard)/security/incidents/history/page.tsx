'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'

type Incident = {
  id: number
  user_id?: string | null
  username?: string | null
  full_name?: string | null
  email?: string | null
  role?: string | null
  action: string
  target_type?: string | null
  target_id?: string | null
  detail?: {
    title?: string
    category?: string
    severity?: string
    description?: string
    status?: string
    reported_at?: string
  } | null
  ip_address?: string | null
  created_at: string
}

const INCIDENT_STATUSES = [
  'OPEN',
  'INVESTIGATING',
  'RESOLVED',
  'CLOSED',
] as const

type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

export default function SecurityIncidentHistoryPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadIncidents(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setError('')
      setMessage('')

      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('token')
          : null

      const response = await fetch(
        '/api/departments/security/incidents?limit=100',
        {
          headers: {
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
        }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            'Failed to load security incidents.'
        )
      }

      setIncidents(
        data?.incidents ||
          (Array.isArray(data) ? data : [])
      )
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Security incidents load nahi ho rahe hain.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadIncidents()
  }, [])

  async function updateIncidentStatus(
    incidentId: number,
    status: IncidentStatus
  ) {
    try {
      setUpdatingId(incidentId)
      setError('')
      setMessage('')

      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('token')
          : null

      if (!token) {
        throw new Error('Authentication token not found.')
      }

      const response = await fetch(
        `/api/departments/security/incidents/${incidentId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
          }),
        }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            'Failed to update incident status.'
        )
      }

      setIncidents((current) =>
        current.map((incident) => {
          if (incident.id !== incidentId) {
            return incident
          }

          return {
            ...incident,
            detail: {
              ...(incident.detail || {}),
              status:
                data?.incident?.detail?.status || status,
            },
          }
        })
      )

      setMessage(
        `Incident status updated to ${formatLabel(status)}.`
      )
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Incident status update nahi ho saka.'
      )
    } finally {
      setUpdatingId(null)
    }
  }

  function getDetail(
    incident: Incident,
    key: keyof NonNullable<Incident['detail']>
  ) {
    return incident.detail?.[key] || ''
  }

  function formatDate(value: string) {
    if (!value) return '—'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return '—'
    }

    return date.toLocaleString()
  }

  function formatLabel(value: string) {
    return value
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  }

  function getSeverityClass(severity: string) {
    if (severity === 'CRITICAL') {
      return 'bg-destructive/15 text-destructive'
    }

    if (severity === 'HIGH') {
      return 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
    }

    if (severity === 'MEDIUM') {
      return 'bg-warning/15 text-warning'
    }

    return 'bg-success/15 text-success'
  }

  function getStatusClass(status: string) {
    if (status === 'OPEN') {
      return 'bg-warning/15 text-warning'
    }

    if (status === 'INVESTIGATING') {
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
    }

    if (status === 'RESOLVED') {
      return 'bg-success/15 text-success'
    }

    if (status === 'CLOSED') {
      return 'bg-muted text-muted-foreground'
    }

    return 'bg-muted text-muted-foreground'
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-6 md:p-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-24">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Loading security incidents...
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8">
          <Link
            href="/security"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Security
          </Link>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-card shadow-sm">
                <ShieldAlert className="size-6 text-destructive" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Security Incident History
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Review security incidents reported by authorized
                  users and recorded in the audit trail.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadIncidents(false)}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`size-4 ${
                    refreshing ? 'animate-spin' : ''
                  }`}
                />
                Refresh
              </button>

              <Link
                href="/security/incidents"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground shadow-sm transition hover:bg-destructive/90"
              >
                <ShieldAlert className="size-4" />
                Report Incident
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700"
          >
            {message}
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Incidents
            </p>

            <p className="mt-2 text-3xl font-bold">
              {incidents.length}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Critical
            </p>

            <p className="mt-2 text-3xl font-bold text-destructive">
              {
                incidents.filter(
                  (incident) =>
                    getDetail(incident, 'severity') === 'CRITICAL'
                ).length
              }
            </p>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              High
            </p>

            <p className="mt-2 text-3xl font-bold">
              {
                incidents.filter(
                  (incident) =>
                    getDetail(incident, 'severity') === 'HIGH'
                ).length
              }
            </p>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Open
            </p>

            <p className="mt-2 text-3xl font-bold">
              {
                incidents.filter(
                  (incident) =>
                    getDetail(incident, 'status') === 'OPEN'
                ).length
              }
            </p>
          </div>
        </section>

        <section className="rounded-lg border bg-card shadow-sm">
          <div className="flex flex-col gap-2 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Reported Incidents
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Security incidents recorded in the audit system.
              </p>
            </div>

            <div className="text-xs text-muted-foreground">
              {incidents.length} incident
              {incidents.length === 1 ? '' : 's'}
            </div>
          </div>

          {incidents.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldAlert className="mx-auto size-10 text-muted-foreground/50" />

              <p className="mt-3 text-sm font-semibold">
                No security incidents found
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Reported security incidents will appear here.
              </p>

              <Link
                href="/security/incidents"
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90"
              >
                <ShieldAlert className="size-4" />
                Report Incident
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Incident
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Category
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Severity
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Reported By
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Time
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {incidents.map((incident) => {
                    const title =
                      getDetail(incident, 'title') ||
                      'Security Incident'

                    const category =
                      getDetail(incident, 'category') || 'OTHER'

                    const severity =
                      getDetail(incident, 'severity') || 'MEDIUM'

                    const status =
                      getDetail(incident, 'status') || 'OPEN'

                    const description =
                      getDetail(incident, 'description')

                    const isUpdating =
                      updatingId === incident.id

                    return (
                      <tr
                        key={incident.id}
                        className="transition hover:bg-muted/20"
                      >
                        <td className="max-w-[350px] px-5 py-4">
                          <p className="font-semibold">
                            {title}
                          </p>

                          {description && (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {description}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-xs font-medium">
                            {formatLabel(category)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getSeverityClass(
                              severity
                            )}`}
                          >
                            {formatLabel(severity)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-2">
                            <span
                              className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                status
                              )}`}
                            >
                              {formatLabel(status)}
                            </span>

                            <select
                              value={status}
                              disabled={isUpdating}
                              onChange={(event) =>
                                updateIncidentStatus(
                                  incident.id,
                                  event.target.value as IncidentStatus
                                )
                              }
                              className="w-40 rounded-md border bg-background px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {INCIDENT_STATUSES.map(
                                (incidentStatus) => (
                                  <option
                                    key={incidentStatus}
                                    value={incidentStatus}
                                  >
                                    {formatLabel(incidentStatus)}
                                  </option>
                                )
                              )}
                            </select>

                            {isUpdating && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Loader2 className="size-3 animate-spin" />
                                Updating...
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium">
                            {incident.full_name ||
                              incident.username ||
                              'System'}
                          </p>

                          {incident.email && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {incident.email}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="size-3.5 text-muted-foreground" />

                            <span className="whitespace-nowrap text-xs text-muted-foreground">
                              {formatDate(incident.created_at)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mt-6 rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 text-warning" />

            <div>
              <h3 className="font-semibold">
                Incident Audit Trail
              </h3>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Incident records are retrieved from the existing
                security activity system. Each record includes the
                incident details, severity, status, reporter, and
                timestamp. Status changes are recorded through the
                backend security audit system.
              </p>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}