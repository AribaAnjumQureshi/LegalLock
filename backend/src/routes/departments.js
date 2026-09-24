const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth");

const {
  logActivity,
  getActivityLogs,
  getSecurityEvents,
  getSecuritySummary,
} = require("../services/activity");

const {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  updateDepartmentStatus,
  deleteDepartment,
} = require("../services/department");

const router = express.Router();

const INCIDENT_STATUSES = [
  "OPEN",
  "INVESTIGATING",
  "RESOLVED",
  "CLOSED",
];

// Create department
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const {
        departmentName,
        departmentCode,
        description,
      } = req.body;

      if (!departmentName || !departmentCode) {
        return res.status(400).json({
          message:
            "departmentName and departmentCode are required",
        });
      }

      const department = await createDepartment({
        departmentName,
        departmentCode,
        description,
        createdBy: req.user?.id || null,
      });

      await logActivity({
        userId: req.user?.id || null,
        action: "DEPARTMENT_CREATED",
        targetType: "department",
        targetId: department.id,
        detail: {
          departmentName: department.department_name,
          departmentCode: department.department_code,
        },
        ip: req.ip,
      });

      res.status(201).json({
        message: "Department created successfully",
        department,
      });
    } catch (error) {
      console.error("Create department error:", error);

      res.status(500).json({
        message: "Failed to create department",
      });
    }
  }
);

// Get all departments
router.get(
  "/",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const departments = await getAllDepartments();

      res.json({
        departments,
      });
    } catch (error) {
      console.error("Get departments error:", error);

      res.status(500).json({
        message: "Failed to fetch departments",
      });
    }
  }
);

// Get security / audit logs
router.get(
  "/security/audit-logs",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const limit = Math.min(
        Math.max(
          parseInt(req.query.limit, 10) || 100,
          1
        ),
        200
      );

      const offset = Math.max(
        parseInt(req.query.offset, 10) || 0,
        0
      );

      const logs = await getActivityLogs({
        limit,
        offset,
      });

      res.json({
        logs,
        pagination: {
          limit,
          offset,
          count: logs.length,
        },
      });
    } catch (error) {
      console.error("Get audit logs error:", error);

      res.status(500).json({
        message: "Failed to fetch audit logs",
      });
    }
  }
);

// Get security events
router.get(
  "/security/events",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const limit = Math.min(
        Math.max(
          parseInt(req.query.limit, 10) || 100,
          1
        ),
        200
      );

      const offset = Math.max(
        parseInt(req.query.offset, 10) || 0,
        0
      );

      const events = await getSecurityEvents({
        limit,
        offset,
      });

      res.json({
        events,
        pagination: {
          limit,
          offset,
          count: events.length,
        },
      });
    } catch (error) {
      console.error(
        "Get security events error:",
        error
      );

      res.status(500).json({
        message: "Failed to fetch security events",
      });
    }
  }
);

// Get security summary
router.get(
  "/security/summary",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const summary = await getSecuritySummary();

      res.json({
        summary,
        period: "last_24_hours",
      });
    } catch (error) {
      console.error(
        "Get security summary error:",
        error
      );

      res.status(500).json({
        message: "Failed to fetch security summary",
      });
    }
  }
);

// Report security incident
router.post(
  "/security/incidents",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const {
        title,
        category,
        severity,
        description,
      } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          message: "Incident title is required",
        });
      }

      if (!description || !description.trim()) {
        return res.status(400).json({
          message: "Incident description is required",
        });
      }

      const allowedCategories = [
        "UNAUTHORIZED_ACCESS",
        "SUSPICIOUS_LOGIN",
        "ACCOUNT_SECURITY",
        "DATA_SECURITY",
        "FACE_VERIFICATION",
        "OTHER",
      ];

      const allowedSeverities = [
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
      ];

      if (!allowedCategories.includes(category)) {
        return res.status(400).json({
          message: "Invalid incident category",
        });
      }

      if (!allowedSeverities.includes(severity)) {
        return res.status(400).json({
          message: "Invalid incident severity",
        });
      }

      await logActivity({
        userId: req.user?.id || null,
        action: "SECURITY_INCIDENT_REPORTED",
        targetType: "SECURITY_INCIDENT",
        targetId: null,
        detail: {
          title: title.trim(),
          category,
          severity,
          description: description.trim(),
          status: "OPEN",
          reported_by: req.user?.id || null,
          reported_at: new Date().toISOString(),
        },
        ip: req.ip,
      });

      res.status(201).json({
        message: "Security incident reported successfully",
      });
    } catch (error) {
      console.error(
        "Report security incident error:",
        error
      );

      res.status(500).json({
        message: "Failed to report security incident",
      });
    }
  }
);

// Get security incidents
router.get(
  "/security/incidents",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const limit = Math.min(
        Math.max(
          parseInt(req.query.limit, 10) || 100,
          1
        ),
        200
      );

      const offset = Math.max(
        parseInt(req.query.offset, 10) || 0,
        0
      );

      const result = await require("../db/pool").query(
        `
        SELECT
          al.id,
          al.user_id,
          u.username,
          u.full_name,
          u.email,
          al.action,
          al.target_type,
          al.target_id,
          al.detail,
          al.ip_address,
          al.created_at
        FROM activity_logs al
        LEFT JOIN users u
          ON u.id = al.user_id
        WHERE al.action = 'SECURITY_INCIDENT_REPORTED'
        ORDER BY al.created_at DESC
        LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      );

      res.json({
        incidents: result.rows,
        pagination: {
          limit,
          offset,
          count: result.rows.length,
        },
      });
    } catch (error) {
      console.error(
        "Get security incidents error:",
        error
      );

      res.status(500).json({
        message: "Failed to fetch security incidents",
      });
    }
  }
);

// Update security incident status
router.patch(
  "/security/incidents/:id/status",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { status } = req.body;
      const incidentId = req.params.id;

      if (!INCIDENT_STATUSES.includes(status)) {
        return res.status(400).json({
          message:
            "Status must be OPEN, INVESTIGATING, RESOLVED, or CLOSED",
        });
      }

      const pool = require("../db/pool");

      const existingIncident = await pool.query(
        `
        SELECT
          id,
          user_id,
          detail
        FROM activity_logs
        WHERE id = $1
          AND action = 'SECURITY_INCIDENT_REPORTED'
        LIMIT 1
        `,
        [incidentId]
      );

      if (existingIncident.rows.length === 0) {
        return res.status(404).json({
          message: "Security incident not found",
        });
      }

      const incident = existingIncident.rows[0];
      const previousStatus =
        incident.detail?.status || "OPEN";

      const updatedDetail = {
        ...incident.detail,
        status,
        updated_by: req.user?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (status === "RESOLVED") {
        updatedDetail.resolved_at =
          new Date().toISOString();
        updatedDetail.resolved_by =
          req.user?.id || null;
      }

      if (status === "CLOSED") {
        updatedDetail.closed_at =
          new Date().toISOString();
        updatedDetail.closed_by =
          req.user?.id || null;
      }

      const updatedIncident = await pool.query(
        `
        UPDATE activity_logs
        SET detail = $1::jsonb
        WHERE id = $2
          AND action = 'SECURITY_INCIDENT_REPORTED'
        RETURNING
          id,
          user_id,
          action,
          target_type,
          target_id,
          detail,
          ip_address,
          created_at
        `,
        [
          JSON.stringify(updatedDetail),
          incidentId,
        ]
      );

      await logActivity({
        userId: req.user?.id || null,
        action: "SECURITY_INCIDENT_STATUS_CHANGED",
        targetType: "SECURITY_INCIDENT",
        targetId: incidentId,
        detail: {
          previousStatus,
          newStatus: status,
          title: incident.detail?.title || null,
        },
        ip: req.ip,
      });

      res.json({
        message:
          "Security incident status updated successfully",
        incident: updatedIncident.rows[0],
      });
    } catch (error) {
      console.error(
        "Update security incident status error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update security incident status",
      });
    }
  }
);

// Get department by ID
router.get(
  "/:id",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const department = await getDepartmentById(
        req.params.id
      );

      if (!department) {
        return res.status(404).json({
          message: "Department not found",
        });
      }

      res.json({
        department,
      });
    } catch (error) {
      console.error(
        "Get department error:",
        error
      );

      res.status(500).json({
        message: "Failed to fetch department",
      });
    }
  }
);

// Update department
router.put(
  "/:id",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const {
        departmentName,
        departmentCode,
        description,
      } = req.body;

      if (!departmentName || !departmentCode) {
        return res.status(400).json({
          message:
            "departmentName and departmentCode are required",
        });
      }

      const department = await updateDepartment(
        req.params.id,
        {
          departmentName,
          departmentCode,
          description,
        }
      );

      if (!department) {
        return res.status(404).json({
          message: "Department not found",
        });
      }

      await logActivity({
        userId: req.user?.id || null,
        action: "DEPARTMENT_UPDATED",
        targetType: "department",
        targetId: department.id,
        detail: {
          departmentName:
            department.department_name,
          departmentCode:
            department.department_code,
        },
        ip: req.ip,
      });

      res.json({
        message:
          "Department updated successfully",
        department,
      });
    } catch (error) {
      console.error(
        "Update department error:",
        error
      );

      res.status(500).json({
        message: "Failed to update department",
      });
    }
  }
);

// Activate / deactivate department
router.patch(
  "/:id/status",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { status } = req.body;

      if (
        !["ACTIVE", "INACTIVE"].includes(status)
      ) {
        return res.status(400).json({
          message:
            "Status must be ACTIVE or INACTIVE",
        });
      }

      const department =
        await updateDepartmentStatus(
          req.params.id,
          status
        );

      if (!department) {
        return res.status(404).json({
          message: "Department not found",
        });
      }

      await logActivity({
        userId: req.user?.id || null,
        action:
          "DEPARTMENT_STATUS_CHANGED",
        targetType: "department",
        targetId: department.id,
        detail: {
          status: department.status,
          departmentName:
            department.department_name,
          departmentCode:
            department.department_code,
        },
        ip: req.ip,
      });

      res.json({
        message: `Department ${status.toLowerCase()} successfully`,
        department,
      });
    } catch (error) {
      console.error(
        "Update department status error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update department status",
      });
    }
  }
);

// Delete department
router.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const department =
        await deleteDepartment(req.params.id);

      if (!department) {
        return res.status(404).json({
          message: "Department not found",
        });
      }

      await logActivity({
        userId: req.user?.id || null,
        action: "DEPARTMENT_DELETED",
        targetType: "department",
        targetId: department.id,
        detail: {
          departmentName:
            department.department_name,
          departmentCode:
            department.department_code,
        },
        ip: req.ip,
      });

      res.json({
        message:
          "Department deleted successfully",
        department,
      });
    } catch (error) {
      console.error(
        "Delete department error:",
        error
      );

      res.status(500).json({
        message: "Failed to delete department",
      });
    }
  }
);

module.exports = router;