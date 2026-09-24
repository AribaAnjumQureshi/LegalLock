const express = require("express");

const {
  authenticate,
  requireRole,
} = require("../middleware/auth");

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

// =========================================================
// CREATE DEPARTMENT
// =========================================================

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

      const department =
        await createDepartment({
          departmentName,
          departmentCode,
          description,
          createdBy:
            req.user?.id || null,
        });

      await logActivity({
        userId: req.user?.id || null,
        action: "DEPARTMENT_CREATED",
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

      return res.status(201).json({
        message:
          "Department created successfully",
        department,
      });
    } catch (error) {
      console.error(
        "Create department error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create department",
      });
    }
  }
);

// =========================================================
// GET ALL DEPARTMENTS
// =========================================================

router.get(
  "/",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const departments =
        await getAllDepartments();

      return res.json({
        departments,
      });
    } catch (error) {
      console.error(
        "Get departments error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch departments",
      });
    }
  }
);

// =========================================================
// SECURITY AUDIT LOGS
// IMPORTANT: Must be before /:id
// =========================================================

router.get(
  "/security/audit-logs",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const limit = Math.min(
        Math.max(
          parseInt(
            req.query.limit,
            10
          ) || 100,
          1
        ),
        200
      );

      const offset = Math.max(
        parseInt(
          req.query.offset,
          10
        ) || 0,
        0
      );

      const logs =
        await getActivityLogs({
          limit,
          offset,
        });

      return res.json({
        logs,
        pagination: {
          limit,
          offset,
          count: logs.length,
        },
      });
    } catch (error) {
      console.error(
        "Get audit logs error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch audit logs",
      });
    }
  }
);

// =========================================================
// SECURITY EVENTS
// =========================================================

router.get(
  "/security/events",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const limit = Math.min(
        Math.max(
          parseInt(
            req.query.limit,
            10
          ) || 100,
          1
        ),
        200
      );

      const offset = Math.max(
        parseInt(
          req.query.offset,
          10
        ) || 0,
        0
      );

      const events =
        await getSecurityEvents({
          limit,
          offset,
        });

      return res.json({
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

      return res.status(500).json({
        message:
          "Failed to fetch security events",
      });
    }
  }
);

// =========================================================
// SECURITY SUMMARY
// =========================================================

router.get(
  "/security/summary",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const summary =
        await getSecuritySummary();

      return res.json({
        summary,
        period: "last_24_hours",
      });
    } catch (error) {
      console.error(
        "Get security summary error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch security summary",
      });
    }
  }
);

// =========================================================
// REPORT SECURITY INCIDENT
// =========================================================

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
        targetType,
        targetId,
      } = req.body || {};

      if (
        !title ||
        !category ||
        !severity ||
        !description
      ) {
        return res.status(400).json({
          message:
            "title, category, severity, and description are required",
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

      if (
        !allowedCategories.includes(
          category
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid incident category",
        });
      }

      if (
        !allowedSeverities.includes(
          severity
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid incident severity",
        });
      }

      await logActivity({
        userId: req.user.id,
        action: "SECURITY_INCIDENT_REPORTED",
        targetType:
          targetType || "security_incident",
        targetId:
          targetId || null,
        detail: {
          title,
          category,
          severity,
          description,
          status: "OPEN",
          reportedBy:
            req.user.id,
          reportedAt:
            new Date().toISOString(),
        },
        ip: req.ip,
      });

      return res.status(201).json({
        message:
          "Security incident reported successfully",
        incident: {
          title,
          category,
          severity,
          description,
          status: "OPEN",
          reportedBy:
            req.user.id,
        },
      });
    } catch (error) {
      console.error(
        "Report security incident error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to report security incident",
      });
    }
  }
);

// =========================================================
// GET SECURITY INCIDENTS
// =========================================================

router.get(
  "/security/incidents",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const limit = Math.min(
        Math.max(
          parseInt(
            req.query.limit,
            10
          ) || 100,
          1
        ),
        200
      );

      const offset = Math.max(
        parseInt(
          req.query.offset,
          10
        ) || 0,
        0
      );

      const { query } =
        require("../db/pool");

      const result = await query(
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
        WHERE al.action =
          'SECURITY_INCIDENT_REPORTED'
        ORDER BY al.created_at DESC
        LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      );

      return res.json({
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

      return res.status(500).json({
        message:
          "Failed to fetch security incidents",
      });
    }
  }
);

// =========================================================
// GET DEPARTMENT BY ID
// =========================================================

router.get(
  "/:id",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const department =
        await getDepartmentById(
          req.params.id
        );

      if (!department) {
        return res.status(404).json({
          message:
            "Department not found",
        });
      }

      return res.json({
        department,
      });
    } catch (error) {
      console.error(
        "Get department error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch department",
      });
    }
  }
);

// =========================================================
// UPDATE DEPARTMENT
// =========================================================

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

      if (
        !departmentName ||
        !departmentCode
      ) {
        return res.status(400).json({
          message:
            "departmentName and departmentCode are required",
        });
      }

      const department =
        await updateDepartment(
          req.params.id,
          {
            departmentName,
            departmentCode,
            description,
          }
        );

      if (!department) {
        return res.status(404).json({
          message:
            "Department not found",
        });
      }

      await logActivity({
        userId: req.user?.id || null,
        action:
          "DEPARTMENT_UPDATED",
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

      return res.json({
        message:
          "Department updated successfully",
        department,
      });
    } catch (error) {
      console.error(
        "Update department error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update department",
      });
    }
  }
);

// =========================================================
// ACTIVATE / DEACTIVATE DEPARTMENT
// =========================================================

router.patch(
  "/:id/status",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { status } =
        req.body;

      if (
        ![
          "ACTIVE",
          "INACTIVE",
        ].includes(status)
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
          message:
            "Department not found",
        });
      }

      await logActivity({
        userId: req.user?.id || null,
        action:
          "DEPARTMENT_STATUS_CHANGED",
        targetType: "department",
        targetId: department.id,
        detail: {
          status:
            department.status,
          departmentName:
            department.department_name,
          departmentCode:
            department.department_code,
        },
        ip: req.ip,
      });

      return res.json({
        message:
          `Department ${status.toLowerCase()} successfully`,
        department,
      });
    } catch (error) {
      console.error(
        "Update department status error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update department status",
      });
    }
  }
);

// =========================================================
// DELETE DEPARTMENT
// =========================================================

router.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const department =
        await deleteDepartment(
          req.params.id
        );

      if (!department) {
        return res.status(404).json({
          message:
            "Department not found",
        });
      }

      await logActivity({
        userId: req.user?.id || null,
        action:
          "DEPARTMENT_DELETED",
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

      return res.json({
        message:
          "Department deleted successfully",
        department,
      });
    } catch (error) {
      console.error(
        "Delete department error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete department",
      });
    }
  }
);

module.exports = router;