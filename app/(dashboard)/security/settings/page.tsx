"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Save,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type SecuritySettings = {
  loginMonitoring: boolean;
  accessMonitoring: boolean;
  faceVerificationMonitoring: boolean;
  securityAlerts: boolean;
  incidentReporting: boolean;
  auditLogging: boolean;
};

const defaultSettings: SecuritySettings = {
  loginMonitoring: true,
  accessMonitoring: true,
  faceVerificationMonitoring: true,
  securityAlerts: true,
  incidentReporting: true,
  auditLogging: true,
};

const settingList = [
  {
    key: "loginMonitoring" as const,
    title: "Login Monitoring",
    description:
      "Monitor successful and failed login activity.",
  },
  {
    key: "accessMonitoring" as const,
    title: "Access Monitoring",
    description:
      "Monitor denied and unauthorized access attempts.",
  },
  {
    key: "faceVerificationMonitoring" as const,
    title: "Face Verification Monitoring",
    description:
      "Monitor failed and error face verification events.",
  },
  {
    key: "securityAlerts" as const,
    title: "Security Alerts",
    description:
      "Enable security alert monitoring for suspicious events.",
  },
  {
    key: "incidentReporting" as const,
    title: "Incident Reporting",
    description:
      "Allow security incidents to be reported and tracked.",
  },
  {
    key: "auditLogging" as const,
    title: "Audit Logging",
    description:
      "Keep an audit trail of security and administrative activity.",
  },
];

export default function SecuritySettingsPage() {
  const [settings, setSettings] =
    useState<SecuritySettings>(defaultSettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(
        "legallock-security-settings"
      );

      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);

        setSettings({
          ...defaultSettings,
          ...parsed,
        });
      }
    } catch {
      setError("Failed to load saved security settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleToggle(
    key: keyof SecuritySettings
  ) {
    setSettings((current) => ({
      ...current,
      [key]: !current[key],
    }));

    setMessage("");
    setError("");
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      /*
       * Security settings are currently stored locally because
       * there is no dedicated security-settings database/API
       * endpoint in the existing backend.
       *
       * The token check above ensures this page is used from
       * an authenticated session.
       */
      localStorage.setItem(
        "legallock-security-settings",
        JSON.stringify(settings)
      );

      setMessage("Security settings saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save security settings."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSettings(defaultSettings);
    setMessage("");
    setError("");
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
          <ShieldCheck className="size-6 text-primary" />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Security Settings
          </h1>

          <p className="text-sm text-muted-foreground">
            Configure security monitoring and audit features.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <XCircle className="size-4" />
          {error}
        </div>
      )}

      {/* Success */}
      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="size-4" />
          {message}
        </div>
      )}

      {/* Settings */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">
            Security Controls
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Enable or disable available security monitoring
            features.
          </p>
        </div>

        <div className="divide-y">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading settings...
            </div>
          ) : (
            settingList.map((setting) => {
              const enabled = settings[setting.key];

              return (
                <div
                  key={setting.key}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="pr-4">
                    <h3 className="font-medium">
                      {setting.title}
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {setting.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() =>
                      handleToggle(setting.key)
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                      enabled
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${
                        enabled
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 border-t p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}

            Save Settings
          </button>
        </div>
      </div>

      {/* Information */}
      <div className="rounded-xl border bg-muted/30 p-5">
        <h2 className="font-semibold">
          Security Configuration
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          These controls define which security monitoring
          features are enabled for the current LEGALLOCK
          session. Security activity and audit events continue
          to be handled by the backend security and activity
          logging system.
        </p>
      </div>
    </div>
  );
}