"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  XCircle,
} from "lucide-react";

type SecuritySummary = {
  failed_logins: number;
  successful_logins: number;
  access_denied: number;
  authentication_failures: number;
  security_alerts: number;
  blocked_logins: number;
  face_verification_failures: number;
};

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
  detail: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function getActionLabel(action: string) {
  return action.replaceAll("_", " ");
}

function getActionClass(action: string) {
  if (
    action === "ACCESS_DENIED" ||
    action === "LOGIN_FAILED" ||
    action === "AUTHENTICATION_FAILED" ||
    action === "FACE_VERIFICATION_FAILED"
  ) {
    return "bg-destructive/10 text-destructive";
  }

  if (action === "SECURITY_ALERT" || action === "LOGIN_BLOCKED") {
    return "bg-yellow-100 text-yellow-800";
  }

  if (action === "LOGIN_SUCCESS") {
    return "bg-green-100 text-green-800";
  }

  return "bg-muted text-muted-foreground";
}

export default function SecurityPage() {
  const [summary, setSummary] = useState<SecuritySummary>({
    failed_logins: 0,
    successful_logins: 0,
    access_denied: 0,
    authentication_failures: 0,
    security_alerts: 0,
    blocked_logins: 0,
    face_verification_failures: 0,
  });

  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSecurityData() {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const [summaryResponse, eventsResponse] = await Promise.all([
        fetch("/api/departments/security/summary", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/departments/security/events?limit=50", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const summaryData = await summaryResponse.json();
      const eventsData = await eventsResponse.json();

      if (!summaryResponse.ok) {
        throw new Error(
          summaryData?.error || "Failed to load security summary."
        );
      }

      if (!eventsResponse.ok) {
        throw new Error(
          eventsData?.error || "Failed to load security events."
        );
      }

      setSummary(summaryData?.summary || summaryData || {});
      setEvents(eventsData?.events || eventsData || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load security information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSecurityData();
  }, []);

  const cards = [
    {
      title: "Failed Logins",
      value: summary.failed_logins,
      icon: XCircle,
      description: "Failed login attempts",
      className: "text-destructive",
    },
    {
      title: "Access Denied",
      value: summary.access_denied,
      icon: ShieldAlert,
      description: "Blocked access attempts",
      className: "text-destructive",
    },
    {
      title: "Security Alerts",
      value: summary.security_alerts,
      icon: AlertTriangle,
      description: "Security alerts",
      className: "text-yellow-600",
    },
    {
      title: "Successful Logins",
      value: summary.successful_logins,
      icon: CheckCircle2,
      description: "Successful logins",
      className: "text-green-600",
    },
    {
      title: "Authentication Failures",
      value: summary.authentication_failures,
      icon: ShieldAlert,
      description: "Authentication failures",
      className: "text-destructive",
    },
    {
      title: "Blocked Logins",
      value: summary.blocked_logins,
      icon: XCircle,
      description: "Blocked login attempts",
      className: "text-orange-600",
    },
    {
      title: "Face Verification Failures",
      value: summary.face_verification_failures,
      icon: ShieldAlert,
      description: "Failed face verification",
      className: "text-destructive",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
              <ShieldCheck className="size-6 text-primary" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Security Monitoring
              </h1>

              <p className="text-sm text-muted-foreground">
                Monitor authentication, access and security activity.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/security/users"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-muted"
          >
            <UserCog className="size-4" />
            User Management
          </Link>

          <Link
            href="/security/incidents/history"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-muted"
          >
            <FileText className="size-4" />
            Incident History
          </Link>

          <Link
            href="/security/incidents"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground shadow-sm transition hover:bg-destructive/90"
          >
            <AlertTriangle className="size-4" />
            Report Incident
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {loading ? "—" : card.value}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {card.description}
                  </p>
                </div>

                <div className="rounded-lg bg-muted p-2.5">
                  <Icon className={`size-5 ${card.className}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Events */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Recent Security Events
            </h2>

            <p className="text-sm text-muted-foreground">
              Latest authentication and access-related activity.
            </p>
          </div>

          <button
            type="button"
            onClick={loadSecurityData}
            className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-muted"
          >
            <Clock3 className="size-4" />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-5 py-3 font-semibold">
                  Time
                </th>

                <th className="px-5 py-3 font-semibold">
                  User
                </th>

                <th className="px-5 py-3 font-semibold">
                  Action
                </th>

                <th className="px-5 py-3 font-semibold">
                  Target
                </th>

                <th className="px-5 py-3 font-semibold">
                  IP Address
                </th>

                <th className="px-5 py-3 font-semibold">
                  Details
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
                    Loading security events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    No security events found.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b last:border-b-0"
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                      {new Date(
                        event.created_at
                      ).toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium">
                        {event.full_name ||
                          event.username ||
                          event.email ||
                          "Unknown user"}
                      </div>

                      {event.role && (
                        <div className="text-xs text-muted-foreground">
                          {event.role}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getActionClass(
                          event.action
                        )}`}
                      >
                        {getActionLabel(event.action)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-sm">
                        {event.target_type || "—"}
                      </div>

                      {event.target_id && (
                        <div className="max-w-[180px] truncate text-xs text-muted-foreground">
                          {event.target_id}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {event.ip_address || "—"}
                    </td>

                    <td className="max-w-[260px] px-5 py-4">
                      <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                        {event.detail
                          ? JSON.stringify(event.detail)
                          : "—"}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}