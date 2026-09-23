"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserX,
} from "lucide-react";

type User = {
  id: string;
  username: string;
  full_name: string | null;
  email: string;
  role: string;
  status: string;
  created_at?: string;
};

const roles = [
  "admin",
  "officer",
  "lawyer",
  "user",
];

export default function SecurityUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const token = getToken();

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const response = await fetch("/api/auth/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load users.");
      }

      setUsers(data?.users || data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load users."
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateUserStatus(
    userId: string,
    currentStatus: string
  ) {
    try {
      setSavingId(userId);
      setError("");
      setSuccess("");

      const token = getToken();

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const nextStatus =
        currentStatus === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";

      const response = await fetch(
        `/api/auth/users/${userId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to update user status."
        );
      }

      setSuccess("User status updated successfully.");
      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update user status."
      );
    } finally {
      setSavingId(null);
    }
  }

  async function updateUserRole(
    userId: string,
    currentRole: string
  ) {
    const newRole = window.prompt(
      `Enter new role:\n${roles.join(", ")}`,
      currentRole
    );

    if (!newRole) {
      return;
    }

    const normalizedRole = newRole.trim().toLowerCase();

    if (!roles.includes(normalizedRole)) {
      setError(
        `Invalid role. Allowed roles: ${roles.join(", ")}`
      );
      return;
    }

    try {
      setSavingId(userId);
      setError("");
      setSuccess("");

      const token = getToken();

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const response = await fetch(
        `/api/auth/users/${userId}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            role: normalizedRole,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to update user role."
        );
      }

      setSuccess("User role updated successfully.");
      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update user role."
      );
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="size-6 text-primary" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Security User Management
            </h1>

            <p className="text-sm text-muted-foreground">
              Manage user accounts, roles and account status.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className="size-4" />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="size-4" />
          {success}
        </div>
      )}

      {/* User Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">
            System Users
          </h2>

          <p className="text-sm text-muted-foreground">
            Activate, deactivate and manage system roles.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-5 py-3 font-semibold">
                  User
                </th>

                <th className="px-5 py-3 font-semibold">
                  Email
                </th>

                <th className="px-5 py-3 font-semibold">
                  Role
                </th>

                <th className="px-5 py-3 font-semibold">
                  Status
                </th>

                <th className="px-5 py-3 font-semibold">
                  Created
                </th>

                <th className="px-5 py-3 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isActive =
                    user.status?.toUpperCase() === "ACTIVE";

                  const isSaving = savingId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="border-b last:border-b-0"
                    >
                      {/* User */}
                      <td className="px-5 py-4">
                        <div className="font-medium">
                          {user.full_name ||
                            user.username ||
                            "Unnamed user"}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          @{user.username}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4 text-muted-foreground">
                        {user.email}
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                          <UserCog className="size-3.5" />
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {isActive ? (
                            <UserCheck className="size-3.5" />
                          ) : (
                            <UserX className="size-3.5" />
                          )}

                          {user.status}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-5 py-4 text-muted-foreground">
                        {user.created_at
                          ? new Date(
                              user.created_at
                            ).toLocaleDateString()
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              updateUserRole(
                                user.id,
                                user.role
                              )
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSaving ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <UserCog className="size-3.5" />
                            )}
                            Change Role
                          </button>

                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              updateUserStatus(
                                user.id,
                                user.status
                              )
                            }
                            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              isActive
                                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                : "bg-green-600 text-white hover:bg-green-700"
                            }`}
                          >
                            {isSaving ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : isActive ? (
                              <UserX className="size-3.5" />
                            ) : (
                              <UserCheck className="size-3.5" />
                            )}

                            {isActive
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}