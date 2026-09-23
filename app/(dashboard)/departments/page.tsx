'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
} from 'lucide-react'

type Department = {
  id: string
  department_name: string
  department_code: string
  description: string | null
  status: 'ACTIVE' | 'INACTIVE'
  member_count: number | string
  created_at: string
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadDepartments() {
    try {
      setLoading(true)
      setError('')

      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('token')
          : null

      const response = await fetch('/api/departments', {
        headers: {
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load departments')
      }

      const data = await response.json()

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.departments)
          ? data.departments
          : []

      setDepartments(list)
    } catch (err) {
      console.error(err)
      setError(
        'Departments load nahi ho pa rahe hain. Backend/API check karein.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDepartments()
  }, [])

  const activeDepartments = useMemo(
    () =>
      departments.filter(
        (department) => department.status === 'ACTIVE'
      ).length,
    [departments]
  )

  const inactiveDepartments = useMemo(
    () =>
      departments.filter(
        (department) => department.status === 'INACTIVE'
      ).length,
    [departments]
  )

  const totalMembers = useMemo(
    () =>
      departments.reduce(
        (total, department) =>
          total + Number(department.member_count || 0),
        0
      ),
    [departments]
  )

  return (
    <main className="min-h-screen bg-background p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Administration
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Department Management
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Manage departments, members, officers and lawyers.
            </p>
          </div>

          <Link
            href="/departments/create"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <Plus className="size-4" />
            Create Department
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Total Departments
              </p>
              <Building2 className="size-5 text-muted-foreground" />
            </div>

            <p className="mt-3 text-3xl font-bold">
              {departments.length}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Active Departments
              </p>
              <CheckCircle2 className="size-5 text-emerald-600" />
            </div>

            <p className="mt-3 text-3xl font-bold">
              {activeDepartments}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Inactive Departments
              </p>
              <XCircle className="size-5 text-muted-foreground" />
            </div>

            <p className="mt-3 text-3xl font-bold">
              {inactiveDepartments}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Total Members
              </p>
              <Users className="size-5 text-muted-foreground" />
            </div>

            <p className="mt-3 text-3xl font-bold">
              {totalMembers}
            </p>
          </div>
        </div>

        <section className="rounded-lg border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Departments
              </h2>

              <p className="text-sm text-muted-foreground">
                View and manage all registered departments.
              </p>
            </div>

            <button
              type="button"
              onClick={loadDepartments}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`size-4 ${
                  loading ? 'animate-spin' : ''
                }`}
              />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-48 items-center justify-center p-8">
              <div className="text-center">
                <RefreshCw className="mx-auto size-6 animate-spin text-muted-foreground" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Loading departments...
                </p>
              </div>
            </div>
          ) : departments.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
              <Building2 className="size-10 text-muted-foreground/50" />

              <h3 className="mt-4 text-base font-semibold">
                No departments found
              </h3>

              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Abhi koi department create nahi hua hai.
              </p>

              <Link
                href="/departments/create"
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="size-4" />
                Create Department
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-5 py-3 text-left font-semibold">
                      Department
                    </th>

                    <th className="px-5 py-3 text-left font-semibold">
                      Code
                    </th>

                    <th className="px-5 py-3 text-left font-semibold">
                      Members
                    </th>

                    <th className="px-5 py-3 text-left font-semibold">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {departments.map((department) => (
                    <tr
                      key={department.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold">
                            {department.department_name}
                          </p>

                          {department.description && (
                            <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">
                              {department.description}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded bg-muted px-2 py-1 font-mono text-xs">
                          {department.department_code}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="size-4 text-muted-foreground" />
                          {Number(department.member_count || 0)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {department.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            <span className="size-1.5 rounded-full bg-muted-foreground" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/departments/${department.id}`}
                          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition hover:bg-muted"
                        >
                          <Eye className="size-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}