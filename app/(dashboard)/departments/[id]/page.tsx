'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  Edit,
  Loader2,
  Plus,
  Power,
  Trash2,
  Users,
} from 'lucide-react'

type Department = {
  id: string
  department_name: string
  department_code: string
  description?: string | null
  status: 'ACTIVE' | 'INACTIVE'
  member_count?: number | string
  created_at?: string
  updated_at?: string
}

type Member = {
  id: string
  user_id: string
  username?: string
  full_name?: string
  email?: string
  role?: string
  department_role?: string
  status?: string
  joined_at?: string
}

type DepartmentRole =
  | 'department_admin'
  | 'officer'
  | 'lawyer'

export default function DepartmentDetailsPage() {
  const params = useParams()

  const departmentId = String(params.id)

  const [department, setDepartment] =
    useState<Department | null>(null)

  const [members, setMembers] = useState<Member[]>([])

  const [loading, setLoading] = useState(true)
  const [changingStatus, setChangingStatus] = useState(false)
  const [memberAction, setMemberAction] = useState<string | null>(
    null
  )
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

      const [departmentData, membersData] =
        await Promise.all([
          apiRequest(
            `/api/departments/${departmentId}`
          ),
          apiRequest(
            `/api/departments/${departmentId}/members`
          ),
        ])

      const departmentItem: Department =
        departmentData?.department ||
        departmentData

      const memberList: Member[] =
        membersData?.members ||
        (Array.isArray(membersData)
          ? membersData
          : [])

      setDepartment(departmentItem)
      setMembers(memberList)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Department details load nahi ho pa rahe hain.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!departmentId) return

    loadDepartment()
  }, [departmentId])

  async function toggleDepartmentStatus() {
    if (!department) return

    const nextStatus =
      department.status === 'ACTIVE'
        ? 'INACTIVE'
        : 'ACTIVE'

    const confirmed = window.confirm(
      nextStatus === 'INACTIVE'
        ? 'Are you sure you want to deactivate this department?'
        : 'Are you sure you want to activate this department?'
    )

    if (!confirmed) return

    try {
      setChangingStatus(true)
      setError('')

      const data = await apiRequest(
        `/api/departments/${departmentId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      )

      const updatedDepartment: Department =
        data?.department ||
        data

      setDepartment((current) => ({
        ...(current || {}),
        ...updatedDepartment,
      }))
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Department status update nahi ho pa raha hai.'
      )
    } finally {
      setChangingStatus(false)
    }
  }

  async function changeMemberRole(member: Member) {
    const currentRole =
      String(
        member.department_role || 'officer'
      ).toLowerCase()

    const enteredRole = window.prompt(
      'Enter department role: officer, lawyer, or department_admin',
      currentRole
    )

    if (enteredRole === null) return

    const newRole =
      enteredRole.trim().toLowerCase()

    const validRoles: DepartmentRole[] = [
      'officer',
      'lawyer',
      'department_admin',
    ]

    if (!validRoles.includes(newRole as DepartmentRole)) {
      window.alert(
        'Invalid role. Use officer, lawyer, or department_admin.'
      )
      return
    }

    if (newRole === currentRole) return

    try {
      setMemberAction(`role-${member.id}`)
      setError('')

      await apiRequest(
        `/api/departments/members/${member.id}/role`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            departmentRole: newRole,
          }),
        }
      )

      await loadDepartment()
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Member role update nahi ho pa raha hai.'
      )
    } finally {
      setMemberAction(null)
    }
  }

  async function toggleMemberStatus(member: Member) {
    const currentStatus =
      String(
        member.status || 'ACTIVE'
      ).toUpperCase()

    const nextStatus =
      currentStatus === 'ACTIVE'
        ? 'DEACTIVATED'
        : 'ACTIVE'

    const memberName =
      member.full_name ||
      member.username ||
      'this member'

    const confirmed = window.confirm(
      nextStatus === 'DEACTIVATED'
        ? `Are you sure you want to deactivate ${memberName}?`
        : `Are you sure you want to activate ${memberName}?`
    )

    if (!confirmed) return

    try {
      setMemberAction(`status-${member.id}`)
      setError('')

      await apiRequest(
        `/api/departments/members/${member.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      )

      await loadDepartment()
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Member status update nahi ho pa raha hai.'
      )
    } finally {
      setMemberAction(null)
    }
  }

  async function removeMember(member: Member) {
    const memberName =
      member.full_name ||
      member.username ||
      'this member'

    const confirmed = window.confirm(
      `Are you sure you want to remove ${memberName} from this department?`
    )

    if (!confirmed) return

    try {
      setMemberAction(`remove-${member.id}`)
      setError('')

      await apiRequest(
        `/api/departments/members/${member.id}`,
        {
          method: 'DELETE',
        }
      )

      await loadDepartment()
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Member remove nahi ho pa raha hai.'
      )
    } finally {
      setMemberAction(null)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-6 md:p-8">
        <div className="mx-auto flex max-w-6xl items-center justify-center py-24">
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
        <div className="mx-auto max-w-6xl">
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

  const activeMembers = members.filter(
    (member) =>
      String(member.status || 'ACTIVE').toUpperCase() ===
      'ACTIVE'
  )

  const officerCount = activeMembers.filter(
    (member) =>
      String(
        member.department_role || member.role || ''
      ).toLowerCase() === 'officer'
  ).length

  const lawyerCount = activeMembers.filter(
    (member) =>
      String(
        member.department_role || member.role || ''
      ).toLowerCase() === 'lawyer'
  ).length

  const departmentAdminCount = activeMembers.filter(
    (member) =>
      String(
        member.department_role || ''
      ).toLowerCase() === 'department_admin'
  ).length

  return (
    <main className="min-h-screen bg-background p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/departments"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Departments
          </Link>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-card shadow-sm">
                <Building2 className="size-6 text-primary" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {department.department_name}
                  </h1>

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

                <p className="mt-2 font-mono text-sm text-muted-foreground">
                  {department.department_code}
                </p>

                {department.description && (
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {department.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/departments/${departmentId}/edit`}
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-semibold transition hover:bg-muted"
              >
                <Edit className="size-4" />
                Edit
              </Link>

              <button
                type="button"
                onClick={toggleDepartmentStatus}
                disabled={changingStatus}
                className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  department.status === 'ACTIVE'
                    ? 'border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15'
                    : 'bg-primary text-primary-foreground hover:opacity-90'
                }`}
              >
                {changingStatus ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Power className="size-4" />
                )}

                {department.status === 'ACTIVE'
                  ? 'Deactivate'
                  : 'Activate'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Members
            </p>

            <p className="mt-2 text-3xl font-bold">
              {activeMembers.length}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Officers
            </p>

            <p className="mt-2 text-3xl font-bold">
              {officerCount}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lawyers
            </p>

            <p className="mt-2 text-3xl font-bold">
              {lawyerCount}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Department Admins
            </p>

            <p className="mt-2 text-3xl font-bold">
              {departmentAdminCount}
            </p>
          </div>
        </section>

        <section className="rounded-lg border bg-card shadow-sm">
          <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Department Members
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Manage officers and lawyers assigned to this department.
              </p>
            </div>

            <Link
              href={`/departments/${departmentId}/members/add`}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <Plus className="size-4" />
              Add Member
            </Link>
          </div>

          {members.length === 0 ? (
            <div className="p-10 text-center">
              <Users className="mx-auto size-10 text-muted-foreground/50" />

              <p className="mt-3 text-sm font-semibold">
                No members assigned
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Add an officer or lawyer to this department.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Member
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      System Role
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Department Role
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {members.map((member) => {
                    const currentStatus =
                      String(
                        member.status || 'ACTIVE'
                      ).toUpperCase()

                    const roleActionLoading =
                      memberAction === `role-${member.id}`

                    const statusActionLoading =
                      memberAction ===
                      `status-${member.id}`

                    const removeActionLoading =
                      memberAction ===
                      `remove-${member.id}`

                    const actionLoading =
                      roleActionLoading ||
                      statusActionLoading ||
                      removeActionLoading

                    return (
                      <tr
                        key={member.id}
                        className="transition hover:bg-muted/20"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold">
                            {member.full_name ||
                              member.username ||
                              'Unknown User'}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {member.email || 'No email'}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="capitalize">
                            {member.role || '—'}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                            {String(
                              member.department_role || '—'
                            ).replace('_', ' ')}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              currentStatus === 'ACTIVE'
                                ? 'bg-success/10 text-success'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {currentStatus}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                changeMemberRole(member)
                              }
                              disabled={actionLoading}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {roleActionLoading ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Edit className="size-3.5" />
                              )}
                              Role
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                toggleMemberStatus(member)
                              }
                              disabled={actionLoading}
                              className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                currentStatus === 'ACTIVE'
                                  ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                                  : 'text-success hover:bg-success/10'
                              }`}
                            >
                              {statusActionLoading ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Power className="size-3.5" />
                              )}

                              {currentStatus === 'ACTIVE'
                                ? 'Deactivate'
                                : 'Activate'}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                removeMember(member)
                              }
                              disabled={actionLoading}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/30 px-2.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {removeActionLoading ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                              Remove
                            </button>
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
      </div>
    </main>
  )
}