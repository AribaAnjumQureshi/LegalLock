"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  RefreshCw,
  ShieldAlert,
  UserX,
} from "lucide-react";

type SecurityEvent = {
  id: number;
  user_id: string | null;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

const suspiciousActions = [
  "LOGIN_FAILED",
  "LOGIN_BLOCKED",
  "AUTHENTICATION_FAILED",
  "ACCESS_DENIED",
  "SECURITY_ALERT",
  "FACE_VERIFICATION_FAILED",
  "FACE_VERIFICATION_ERROR",
];

function getActionLabel(action: string) {
  return action.replaceAll("_", " ");
}

function getActionClass(action: string) {
  switch (action) {
    case "LOGIN_FAILED":
    case "LOGIN_BLOCKED":
    case "AUTHENTICATION_FAILED":
      return "bg-yellow-100 text-yellow-800";

    case "ACCESS_DENIED":
    case "SECURITY_ALERT":
    case "FACE_VERIFICATION_FAILED":
    case "FACE_VERIFICATION_ERROR":
      return "bg-red-100 text-red-800";

    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}

function getUserName(event: SecurityEvent) {
  return (
    event.full_name ||
    event.username ||
    event.email ||
    event.user_id ||
    "Unknown user"
  );
}

function getDetailText(event: SecurityEvent) {
  if (!event.detail) {
    return "-";
  }

  const values = Object.entries(event.detail)
    .map(([key, value]) => {
      if (value === null || value === undefined) {
        return null;
      }

      if (typeof value === "object") {
        return `${key}: ${JSON.stringify(value)}`;
      }

      return `${key}: ${String(value)}`;
    })
    .filter(Boolean);

  return values.join(" • ") || "-";
}

export default function SuspiciousActivityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");

  async function loadEvents(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const response = await fetch(
        "/api/departments/security/events?limit=100",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Failed to load security events."
        );
      }

      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load suspicious activity."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const suspiciousEvents = useMemo(
    () =>
      events.filter((event) =>
        suspiciousActions.includes(event.action)
      ),
    [events]
  );

  const filteredEvents = useMemo(() => {
    if (filter === "ALL") {
      return suspiciousEvents;
    }

    return suspiciousEvents.filter(
      (event) => event.action === filter
    );
  }, [filter, suspiciousEvents]);

  const failedLogins = suspiciousEvents.filter(
    (event) => event.action === "LOGIN_FAILED"
  ).length;

  const accessDenied = suspiciousEvents.filter(
    (event) => event.action === "ACCESS_DENIED"
  ).length;

  const securityAlerts = suspiciousEvents.filter(
    (event) => event.action === "SECURITY_ALERT"
  ).length;

  const authenticationFailures =
    suspiciousEvents.filter(
      (event) =>
        event.action === "AUTHENTICATION_FAILED"
    ).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <ShieldAlert className="size-6 text-red-600" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Suspicious Activity
            </h1>

            <p className="text-sm text-muted-foreground">
              Monitor suspicious login, access, authentication,
              and security activity.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadEvents(false)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Failed Logins
            </p>

            <UserX className="size-5 text-yellow-600" />
          </div>

          <p className="mt-3 text-3xl font-bold">
            {failedLogins}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Access Denied
            </p>

            <ShieldAlert className="size-5 text-red-600" />
          </div>

          <p className="mt-3 text-3xl font-bold">
            {accessDenied}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Security Alerts
            </p>

            <AlertTriangle className="size-5 text-red-600" />
          </div>

          <p className="mt-3 text-3xl font-bold">
            {securityAlerts}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Authentication Failures
            </p>

            <Clock3 className="size-5 text-orange-600" />
          </div>

          <p className="mt-3 text-3xl font-bold">
            {authenticationFailures}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">
              Suspicious Events
            </h2>

            <p className="text-sm text-muted-foreground">
              {filteredEvents.length} suspicious event
              {filteredEvents.length === 1 ? "" : "s"} found.
            </p>
          </div>

          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value)
            }
            className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Suspicious Events</option>

            {suspiciousActions.map((action) => (
              <option key={action} value={action}>
                {getActionLabel(action)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Loading suspicious activity...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle2 className="size-10 text-green-600" />

            <h3 className="mt-3 font-semibold">
              No suspicious activity found
            </h3>

            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              There are no suspicious security events matching
              the selected filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    Event
                  </th>

                  <th className="px-4 py-3 text-left font-semibold">
                    User
                  </th>

                  <th className="px-4 py-3 text-left font-semibold">
                    Role
                  </th>

                  <th className="px-4 py-3 text-left font-semibold">
                    IP Address
                  </th>

                  <th className="px-4 py-3 text-left font-semibold">
                    Details
                  </th>

                  <th className="px-4 py-3 text-left font-semibold">
                    Time
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-muted/30"
                  >
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getActionClass(
                          event.action
                        )}`}
                      >
                        {getActionLabel(event.action)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium">
                        {getUserName(event)}
                      </div>

                      {event.email && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {event.email}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {event.role || "-"}
                    </td>

                    <td className="px-4 py-4 font-mono text-xs">
                      {event.ip_address || "-"}
                    </td>

                    <td className="max-w-[320px] px-4 py-4">
                      <div className="truncate text-xs text-muted-foreground">
                        {getDetailText(event)}
                      </div>

                      {event.target_type && (
                        <div className="mt-1 text-xs">
                          Target: {event.target_type}
                          {event.target_id
                            ? ` / ${event.target_id}`
                            : ""}
                        </div>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">
                      {formatDate(event.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information */}
      <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-5">
        <Eye className="mt-0.5 size-5 shrink-0 text-primary" />

        <div>
          <h2 className="font-semibold">
            Security Monitoring
          </h2>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            This page reads security events from the existing
            LEGALLOCK activity log system. Suspicious activity
            includes failed authentication, denied access,
            security alerts, blocked login attempts, and face
            verification failures.
          </p>
        </div>
      </div>
    </div>
  );
}