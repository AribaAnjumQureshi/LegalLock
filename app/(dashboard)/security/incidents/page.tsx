'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from 'lucide-react'

const categories = [
  {
    value: 'UNAUTHORIZED_ACCESS',
    label: 'Unauthorized Access',
  },
  {
    value: 'SUSPICIOUS_LOGIN',
    label: 'Suspicious Login',
  },
  {
    value: 'ACCOUNT_SECURITY',
    label: 'Account Security',
  },
  {
    value: 'DATA_SECURITY',
    label: 'Data Security',
  },
  {
    value: 'FACE_VERIFICATION',
    label: 'Face Verification',
  },
  {
    value: 'OTHER',
    label: 'Other',
  },
]

const severities = [
  {
    value: 'LOW',
    label: 'Low',
  },
  {
    value: 'MEDIUM',
    label: 'Medium',
  },
  {
    value: 'HIGH',
    label: 'High',
  },
  {
    value: 'CRITICAL',
    label: 'Critical',
  },
]

export default function SecurityIncidentPage() {
  const [title, setTitle] = useState('')
  const [category, setCategory] =
    useState('UNAUTHORIZED_ACCESS')
  const [severity, setSeverity] =
    useState('MEDIUM')
  const [description, setDescription] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')
    setSuccess(false)

    if (!title.trim()) {
      setError('Please enter an incident title.')
      return
    }

    if (!description.trim()) {
      setError('Please describe the security incident.')
      return
    }

    try {
      setLoading(true)

      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('token')
          : null

      const response = await fetch(
        '/api/departments/security/incidents',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
          body: JSON.stringify({
            title: title.trim(),
            category,
            severity,
            description: description.trim(),
          }),
        }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            'Failed to report security incident.'
        )
      }

      setSuccess(true)
      setTitle('')
      setCategory('UNAUTHORIZED_ACCESS')
      setSeverity('MEDIUM')
      setDescription('')
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Security incident report nahi ho paya.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background p-6 md:p-8">
      <div className="mx-auto max-w-4xl">

        {/* Back */}
        <Link
          href="/security"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Security
        </Link>

        {/* Header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-card shadow-sm">
            <ShieldAlert className="size-6 text-destructive" />
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Report Security Incident
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Record a suspicious, unauthorized, or security-related
              incident for the department security audit trail.
            </p>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-4 text-sm"
          >
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />

            <div>
              <p className="font-semibold text-success">
                Security incident reported successfully.
              </p>

              <p className="mt-1 text-muted-foreground">
                The incident has been added to the security audit trail.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />

            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border bg-card shadow-sm"
        >
          <div className="border-b p-6">
            <h2 className="text-lg font-semibold">
              Incident Details
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Provide accurate information so the incident can be
              reviewed and tracked.
            </p>
          </div>

          <div className="space-y-6 p-6">

            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-semibold"
              >
                Incident Title
              </label>

              <input
                id="title"
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="e.g. Suspicious login attempt"
                maxLength={200}
                disabled={loading}
                className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <p className="mt-1.5 text-xs text-muted-foreground">
                Give the incident a short and clear title.
              </p>
            </div>

            {/* Category + Severity */}
            <div className="grid gap-6 md:grid-cols-2">

              {/* Category */}
              <div>
                <label
                  htmlFor="category"
                  className="mb-2 block text-sm font-semibold"
                >
                  Incident Category
                </label>

                <select
                  id="category"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                  disabled={loading}
                  className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {categories.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label
                  htmlFor="severity"
                  className="mb-2 block text-sm font-semibold"
                >
                  Severity
                </label>

                <select
                  id="severity"
                  value={severity}
                  onChange={(event) =>
                    setSeverity(event.target.value)
                  }
                  disabled={loading}
                  className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {severities.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-semibold"
              >
                Incident Description
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Describe what happened, when it happened, and any relevant security details..."
                rows={7}
                maxLength={5000}
                disabled={loading}
                className="w-full resize-y rounded-md border bg-background px-3 py-2.5 text-sm leading-6 outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                <span>
                  Include relevant details for the security review.
                </span>

                <span>
                  {description.length}/5000
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 border-t bg-muted/20 p-6 sm:flex-row sm:justify-end">
            <Link
              href="/security"
              className="inline-flex items-center justify-center rounded-md border bg-background px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground shadow-sm transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Reporting...
                </>
              ) : (
                <>
                  <ShieldAlert className="size-4" />
                  Report Incident
                </>
              )}
            </button>
          </div>
        </form>

        {/* Information */}
        <div className="mt-6 rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 text-warning" />

            <div>
              <h3 className="font-semibold">
                Security Reporting
              </h3>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Reported incidents are stored in the existing audit
                activity system with the selected category, severity,
                description, reporter, and timestamp.
              </p>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}