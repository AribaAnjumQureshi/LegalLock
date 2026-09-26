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

export default function AddSystemSecurityMemberPage() {
  const params = useParams()
  const router = useRouter()

  const systemSecurityId = String(params.id)

  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [systemSecurityRole, setSystemSecurityRole] = useState<
    'officer' | 'lawyer' | 'system_security_admin'
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
    if (!systemSecurityId) return

    loadUsers()
  }, [systemSecurityId])

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
        setSystemSecurityRole(systemRole)
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
        `/api/departments/${systemSecurityId}/members`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: selectedUserId,

            // Keep this API field unchanged for current backend compatibility
            departmentRole: systemSecurityRole,
          }),
        }
      )

      router.push(`/departments/${systemSecurityId}`)
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
      <div className="mx-auto max-w-