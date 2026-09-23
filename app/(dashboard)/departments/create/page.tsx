'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  Loader2,
  Save,
} from 'lucide-react'

export default function CreateDepartmentPage() {
  const router = useRouter()

  const [departmentName, setDepartmentName] = useState('')
  const [departmentCode, setDepartmentCode] = useState('')
  const [description, setDescription] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')

    const name = departmentName.trim()
    const code = departmentCode.trim().toUpperCase()
    const details = description.trim()

    if (!name) {
      setError('Department name is required.')
      return
    }

    if (!code) {
      setError('Department code is required.')
      return
    }

    try {
      setLoading(true)

      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('token')
          : null

      const response = await fetch('/api/departments', {
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
          departmentName: name,
          departmentCode: code,
          description: details || null,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            'Failed to create department.'
        )
      }

      router.push('/departments')
      router.refresh()
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Department create nahi ho pa raha hai.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/departments"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Departments
          </Link>

          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-card shadow-sm">
              <Building2 className="size-6 text-primary" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Administration
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                Create Department
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                Add a new department to the LegalLock system.
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <section className="rounded-lg border bg-card shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-lg font-semibold">
              Department Information
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Enter the basic information for the new department.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6 p-6">
              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              {/* Department Name */}
              <div className="space-y-2">
                <label
                  htmlFor="departmentName"
                  className="text-sm font-semibold"
                >
                  Department Name
                  <span className="ml-1 text-destructive">*</span>
                </label>

                <input
                  id="departmentName"
                  name="departmentName"
                  type="text"
                  value={departmentName}
                  onChange={(event) =>
                    setDepartmentName(event.target.value)
                  }
                  placeholder="e.g. Legal Affairs Department"
                  disabled={loading}
                  maxLength={150}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <p className="text-xs text-muted-foreground">
                  Enter the official name of the department.
                </p>
              </div>

              {/* Department Code */}
              <div className="space-y-2">
                <label
                  htmlFor="departmentCode"
                  className="text-sm font-semibold"
                >
                  Department Code
                  <span className="ml-1 text-destructive">*</span>
                </label>

                <input
                  id="departmentCode"
                  name="departmentCode"
                  type="text"
                  value={departmentCode}
                  onChange={(event) =>
                    setDepartmentCode(
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="e.g. LEGAL-01"
                  disabled={loading}
                  maxLength={40}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm uppercase outline-none transition placeholder:text-muted-foreground placeholder:normal-case focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <p className="text-xs text-muted-foreground">
                  Use a unique code for identifying the department.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="text-sm font-semibold"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Describe the department's purpose and responsibilities..."
                  disabled={loading}
                  rows={5}
                  maxLength={1000}
                  className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Optional</span>
                  <span>{description.length}/1000</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 border-t bg-muted/20 p-6 sm:flex-row sm:justify-end">
              <Link
                href="/departments"
                className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition hover:bg-muted"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Create Department
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Security Note */}
        <div className="mt-5 rounded-lg border bg-muted/20 p-4">
          <p className="text-xs leading-5 text-muted-foreground">
            <span className="font-semibold text-foreground">
              Security:
            </span>{' '}
            Department creation is restricted to authorized
            administrators. The department creation action is also
            recorded in the system activity log.
          </p>
        </div>
      </div>
    </main>
  )
}