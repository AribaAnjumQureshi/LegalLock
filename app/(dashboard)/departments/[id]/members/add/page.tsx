'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  UserPlus,
  Users,
} from 'lucide-react'

type User = {
  id: string
  username?: string
  full_name?: string
  email?: string
  role: string
  status?: string
}

export default function AddDepartmentMemberPage() {
  const params = useParams()
  const router = useRouter()

  const departmentId = String(params.id)

  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [departmentRole, setDepartmentRole] = useState<
    'officer' | 'lawyer' | 'department_admin'
  >('officer')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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

  async function loadUsers() {
    try {
      setLoading(true)
      setError('')

      const data = await apiRequest('/api/auth/users')

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.users)
          ? data.users
          : []

      const availableUsers = list.filter(
        (user: User) =>
          ['officer', 'lawyer'].includes(
            String(user.role).toLowerCase()
          ) &&
          String(user.status || 'active').toLowerCase() ===
            'active'
      )

      setUsers(availableUsers)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Users load nahi ho pa rahe hain.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!departmentId) return

    loadUsers()
  }, [departmentId])

  function handleUserChange(value: string) {
    setSelectedUserId(value)

    const selectedUser = users.find(
      (user) => user.id === value
    )

    if (selectedUser) {
      const systemRole = String(
        selectedUser.role
      ).toLowerCase()

      if (
        systemRole === 'officer' ||
        systemRole === 'lawyer'
      ) {
        setDepartmentRole(systemRole)
      }
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setError('')

    if (!selectedUserId) {
      setError('Please select a user.')
      return
    }

    try {
      setSubmitting(true)

      await apiRequest(
        `/api/departments/${departmentId}/members`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: selectedUserId,
            departmentRole,
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
          : 'Member add nahi ho pa raha hai.'
      )
    } finally {
      setSubmitting(false)
    }
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
              <UserPlus className="size-6 text-primary" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Department Management
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                Add Department Member
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                Assign an active officer or lawyer to this
                department.
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-lg border bg-card shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-lg font-semibold">
              Member Assignment
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Select a system user and assign their department
              role.
            </p>
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
                  htmlFor="user"
                  className="text-sm font-semibold"
                >
                  Select User
                  <span className="ml-1 text-destructive">
                    *
                  </span>
                </label>

                {loading ? (
                  <div className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading users...
                  </div>
                ) : users.length === 0 ? (
                  <div className="rounded-md border border-dashed p-5 text-center">
                    <Users className="mx-auto size-8 text-muted-foreground/50" />

                    <p className="mt-2 text-sm font-medium">
                      No active officers or lawyers found
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      There are currently no eligible active
                      users available for department assignment.
                    </p>
                  </div>
                ) : (
                  <select
                    id="user"
                    value={selectedUserId}
                    onChange={(event) =>
                      handleUserChange(event.target.value)
                    }
                    disabled={submitting}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      Select an officer or lawyer
                    </option>

                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name ||
                          user.username ||
                          'Unknown User'}
                        {user.email
                          ? ` — ${user.email}`
                          : ''}
                        {` (${user.role})`}
                      </option>
                    ))}
                  </select>
                )}

                <p className="text-xs text-muted-foreground">
                  Only active users with the Officer or Lawyer
                  system role are available.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="departmentRole"
                  className="text-sm font-semibold"
                >
                  Department Role
                  <span className="ml-1 text-destructive">
                    *
                  </span>
                </label>

                <select
                  id="departmentRole"
                  value={departmentRole}
                  onChange={(event) =>
                    setDepartmentRole(
                      event.target.value as
                        | 'officer'
                        | 'lawyer'
                        | 'department_admin'
                    )
                  }
                  disabled={
                    submitting || !selectedUserId
                  }
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="officer">
                    Officer
                  </option>

                  <option value="lawyer">
                    Lawyer
                  </option>

                  <option value="department_admin">
                    Department Admin
                  </option>
                </select>

                <p className="text-xs text-muted-foreground">
                  Department Admin is a department-level role.
                  The backend validates that the selected user
                  has an eligible Officer or Lawyer system role.
                </p>
              </div>

              <div className="rounded-md border bg-muted/30 p-4">
                <div className="flex gap-3">
                  <Users className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm font-semibold">
                      Role assignment
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      The selected user will become an active
                      member of this department. Their department
                      role controls their responsibilities inside
                      the department.
                    </p>
                  </div>
                </div>
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
                  submitting ||
                  loading ||
                  users.length === 0 ||
                  !selectedUserId
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Adding Member...
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" />
                    Add Member
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <div className="mt-5 rounded-lg border bg-muted/20 p-4">
          <p className="text-xs leading-5 text-muted-foreground">
            <span className="font-semibold text-foreground">
              Security:
            </span>{' '}
            Member assignment is restricted to authorized
            administrators and is recorded in the department
            activity/audit trail.
          </p>
        </div>
      </div>
    </main>
  )
}