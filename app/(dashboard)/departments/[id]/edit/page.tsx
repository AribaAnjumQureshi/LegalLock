'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Save,
  Building2,
} from 'lucide-react'

type Department = {
  id: string
  department_name: string
  department_code: string
  description?: string | null
  status: 'ACTIVE' | 'INACTIVE'
}

export default function EditDepartmentPage() {
  const params = useParams()
  const router = useRouter()

  const departmentId = String(params.id)

  const [department, setDepartment] =
    useState<Department | null>(null)

  const [departmentName, setDepartmentName] = useState('')
  const [departmentCode, setDepartmentCode] = useState('')
  const [description, setDescription] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function apiRequest(
    path: string,
    options?: RequestInit
  ) {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('token')
        : null

    const response = await fetch(path, {
      ...options,
      headers: {
        ...(options?.headers || {}),
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          'Request failed.'
      )
    }

    return data
  }

  async function loadDepartment() {
    try {
      setLoading(true)
      setError('')

      const data = await apiRequest(
        `/api/departments/${departmentId}`
      )

      const item: Department =
        data?.department || data

      setDepartment(item)

      setDepartmentName(item.department_name || '')
      setDepartmentCode(item.department_code || '')
      setDescription(item.description || '')
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Department load nahi ho pa raha hai.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!departmentId) return

    loadDepartment()
  }, [departmentId])

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setError('')

    const cleanName = departmentName.trim()
    const cleanCode = departmentCode.trim()
    const cleanDescription = description.trim()

    if (!cleanName) {
      setError('Department name is required.')
      return
    }

    if (!cleanCode) {
      setError('Department code is required.')
      return
    }

    try {
      setSaving(true)

      await apiRequest(
        `/api/departments/${departmentId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            departmentName: cleanName,
            departmentCode: cleanCode,
            description: cleanDescription,
          }),
        }
      )

      router.push(`/departments/${departmentId}`)
      router.refresh()
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Department update nahi ho pa raha hai.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-6 md:p-8">
        <div className="mx-auto flex max-w-3xl items-center justify-center py-24">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Loading department...
          </div>
        </div>
      </main>
    )
  }

  if (!department) {
    return (
      <main className="min-h-screen bg-background p-6 md:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-5">
            <p className="text-sm font-semibold text-destructive">
              Department not found
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {error ||
                'The requested department could not be found.'}
            </p>

            <Link
              href="/departments"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="size-4" />
              Back to Departments
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href={`/departments/${departmentId}`}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Department
          </Link>

          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-card shadow-sm">
              <Building2 className="size-6 text-primary" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Department Management
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                Edit Department
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                Update the department information and details.
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-lg border bg-card shadow-sm">
          <div className="border-b p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Department Information
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Modify the details below and save your changes.
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  department.status === 'ACTIVE'
                    ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {department.status}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6 p-6">
              {error && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="departmentName"
                  className="text-sm font-semibold"
                >
                  Department Name
                  <span className="ml-1 text-destructive">
                    *
                  </span>
                </label>

                <input
                  id="departmentName"
                  type="text"
                  value={departmentName}
                  onChange={(event) =>
                    setDepartmentName(event.target.value)
                  }
                  disabled={saving}
                  placeholder="Enter department name"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="departmentCode"
                  className="text-sm font-semibold"
                >
                  Department Code
                  <span className="ml-1 text-destructive">
                    *
                  </span>
                </label>

                <input
                  id="departmentCode"
                  type="text"
                  value={departmentCode}
                  onChange={(event) =>
                    setDepartmentCode(
                      event.target.value.toUpperCase()
                    )
                  }
                  disabled={saving}
                  placeholder="e.g. LEGAL-001"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm uppercase outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <p className="text-xs text-muted-foreground">
                  Department code must remain unique.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="text-sm font-semibold"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  disabled={saving}
                  placeholder="Enter department description"
                  rows={5}
                  className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="rounded-md border bg-muted/30 p-4">
                <p className="text-xs leading-5 text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Current status:
                  </span>{' '}
                  {department.status}. Status activation and
                  deactivation are managed separately from this
                  form.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t bg-muted/20 p-6 sm:flex-row sm:justify-end">
              <Link
                href={`/departments/${departmentId}`}
                className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition hover:bg-muted"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={
                  saving ||
                  !departmentName.trim() ||
                  !departmentCode.trim()
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}