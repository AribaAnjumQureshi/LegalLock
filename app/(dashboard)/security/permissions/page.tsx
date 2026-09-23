"use client";

import { useState } from "react";
import {
  Check,
  LockKeyhole,
  Save,
  ShieldCheck,
  Users,
} from "lucide-react";

type Role = "department_admin" | "officer" | "lawyer";

type Permission = {
  key: string;
  title: string;
  description: string;
};

const permissions: Permission[] = [
  {
    key: "view_department",
    title: "View System Security",
    description: "View system security details and information.",
  },
  {
    key: "manage_department",
    title: "Manage System Security",
    description: "Edit and manage system security details.",
  },
  {
    key: "view_members",
    title: "View Members",
    description: "View officers and lawyers assigned to the system security.",
  },
  {
    key: "manage_members",
    title: "Manage Members",
    description: "Add, remove, activate, or deactivate members.",
  },
  {
    key: "manage_roles",
    title: "Manage Member Roles",
    description: "Change department-level roles of members.",
  },
  {
    key: "view_audit_logs",
    title: "View Audit Logs",
    description: "View system activity and audit records.",
  },
  {
    key: "view_security_events",
    title: "View Security Events",
    description: "View login, access, and authentication security events.",
  },
  {
    key: "report_incidents",
    title: "Report Security Incidents",
    description: "Create and report security incidents.",
  },
  {
    key: "view_incidents",
    title: "View Incident History",
    description: "View previously reported security incidents.",
  },
  {
    key: "manage_security_settings",
    title: "Manage Security Settings",
    description: "Configure available security monitoring settings.",
  },
];

const defaultPermissions: Record<Role, string[]> = {
  department_admin: permissions.map((permission) => permission.key),

  officer: [
    "view_department",
    "view_members",
    "view_audit_logs",
    "view_security_events",
    "report_incidents",
    "view_incidents",
  ],

  lawyer: [
    "view_department",
    "view_members",
    "view_audit_logs",
    "view_security_events",
    "report_incidents",
    "view_incidents",
  ],
};

const roleDetails: Record<
  Role,
  {
    title: string;
    description: string;
  }
> = {
  department_admin: {
    title: "System Security Admin",
    description:
      "Manages system security members, roles, security settings, audit activity, and incidents.",
  },

  officer: {
    title: "Officer",
    description:
      "Can access assigned system security information and relevant security monitoring features.",
  },

  lawyer: {
    title: "Lawyer",
    description:
      "Can access assigned system security information and relevant security monitoring features.",
  },
};

export default function PermissionsPage() {
  const [selectedRole, setSelectedRole] =
    useState<Role>("department_admin");

  const [rolePermissions, setRolePermissions] =
    useState<Record<Role, string[]>>(defaultPermissions);

  const [message, setMessage] = useState("");

  const currentPermissions =
    rolePermissions[selectedRole];

  function togglePermission(permissionKey: string) {
    setRolePermissions((current) => {
      const existing = current[selectedRole];

      const updated = existing.includes(permissionKey)
        ? existing.filter((key) => key !== permissionKey)
        : [...existing, permissionKey];

      return {
        ...current,
        [selectedRole]: updated,
      };
    });

    setMessage("");
  }

  function selectAll() {
    setRolePermissions((current) => ({
      ...current,
      [selectedRole]: permissions.map(
        (permission) => permission.key
      ),
    }));

    setMessage("");
  }

  function clearAll() {
    setRolePermissions((current) => ({
      ...current,
      [selectedRole]: [],
    }));

    setMessage("");
  }

  function handleSave() {
    localStorage.setItem(
      "legallock-role-permissions",
      JSON.stringify(rolePermissions)
    );

    setMessage(
      "Permissions saved successfully for the selected role."
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <LockKeyhole className="size-6 text-primary" />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Permissions Management
          </h1>

          <p className="text-sm text-muted-foreground">
            Configure permissions for System Security roles.
          </p>
        </div>
      </div>

      {/* Success message */}
      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <Check className="size-4" />
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Roles */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b p-5">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" />

              <h2 className="font-semibold">
                System Roles
              </h2>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              Select a role to manage its permissions.
            </p>
          </div>

          <div className="space-y-2 p-3">
            {(Object.keys(roleDetails) as Role[]).map(
              (role) => {
                const selected = role === selectedRole;

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role);
                      setMessage("");
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium">
                      {roleDetails[role].title}
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      {role}
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Permission panel */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {roleDetails[selectedRole].title}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {roleDetails[selectedRole].description}
                </p>
              </div>

              <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                <span className="font-semibold">
                  {currentPermissions.length}
                </span>{" "}
                / {permissions.length} permissions
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                Select All
              </button>

              <button
                type="button"
                onClick={clearAll}
                className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Permissions */}
          <div className="divide-y">
            {permissions.map((permission) => {
              const enabled =
                currentPermissions.includes(
                  permission.key
                );

              return (
                <button
                  key={permission.key}
                  type="button"
                  onClick={() =>
                    togglePermission(permission.key)
                  }
                  className="flex w-full items-start gap-4 p-5 text-left transition hover:bg-muted/50"
                >
                  <div
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${
                      enabled
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {enabled && (
                      <Check className="size-3.5" />
                    )}
                  </div>

                  <div>
                    <div className="font-medium">
                      {permission.title}
                    </div>

                    <div className="mt-1 text-sm text-muted-foreground">
                      {permission.description}
                    </div>

                    <div className="mt-2 font-mono text-xs text-muted-foreground">
                      {permission.key}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Save */}
          <div className="flex justify-end border-t p-5">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Save className="size-4" />
              Save Permissions
            </button>
          </div>
        </div>
      </div>

      {/* Security note */}
      <div className="rounded-xl border bg-muted/30 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 text-primary" />

          <div>
            <h2 className="font-semibold">
              Permission Control
            </h2>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Permissions are organized by System Security
              role so that access can be managed separately
              for administrators, officers, and lawyers.
              Backend authorization remains the final security
              boundary for protected operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}