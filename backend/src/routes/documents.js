const express = require("express")
const multer = require("multer")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")
const { query } = require("../db/pool")
const { authenticate, requireRole } = require("../middleware/auth")
const { logActivity } = require("../services/activity")
const { hashBuffer, hashFile, hashesEqual } = require("../utils/hash")

const router = express.Router()

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./storage")
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_BYTES) || 26214400,
  },
})

router.use(authenticate)

// ============================================================
// DOCUMENT ACCESS CONTROL
// ============================================================

async function canAccess(documentId, userId, access = "read") {
  const { rows } = await query(
    `SELECT d.uploaded_by,
            COALESCE(p.can_read, false) AS can_read,
            COALESCE(p.can_write, false) AS can_write
     FROM documents d
     LEFT JOIN document_permissions p
       ON p.document_id = d.id
      AND p.user_id = $2
     WHERE d.id = $1`,
    [documentId, userId],
  )

  const row = rows[0]

  if (!row) {
    return {
      exists: false,
      allowed: false,
    }
  }

  // Document owner has full access
  if (row.uploaded_by === userId) {
    return {
      exists: true,
      allowed: true,
      owner: true,
    }
  }

  // Admin has full access
  if (await reqIsAdmin(userId)) {
    return {
      exists: true,
      allowed: true,
      owner: false,
      admin: true,
    }
  }

  return {
    exists: true,
    allowed: access === "write" ? row.can_write : row.can_read,
    owner: false,
  }
}

// Admin lookup is kept server-side.
// Client cannot supply or fake a role.
async function reqIsAdmin(userId) {
  const { rows } = await query(
    "SELECT role FROM users WHERE id=$1",
    [userId],
  )

  return rows[0]?.role === "admin"
}

async function requireDocumentAccess(req, res, documentId, access) {
  const result = await canAccess(
    documentId,
    req.user.id,
    access,
  )

  if (!result.exists) {
    res.status(404).json({
      error: "Document not found",
    })
    return false
  }

  if (!result.allowed) {
    await logActivity({
      userId: req.user.id,
      action: "ACCESS_DENIED",
      targetType: "document",
      targetId: documentId,
      detail: { access },
      ip: req.ip,
    })

    res.status(403).json({
      error: `Document ${access} access requires administrator approval`,
    })

    return false
  }

  return true
}

// ============================================================
// UPLOAD DOCUMENT
// ============================================================

// Upload: admin/officer only
router.post(
  "/",
  requireRole("admin", "officer"),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: "A file is required (multipart field 'file')",
      })
    }

    const {
      caseId,
      docType,
      description,
      classification,
      status,
    } = req.body || {}

    if (!caseId || !docType) {
      return res.status(400).json({
        error: "caseId and docType are required",
      })
    }

    const allowedClassification = [
      "Unclassified",
      "Restricted",
      "Confidential",
    ]

    const allowedStatus = [
      "Sealed",
      "In Review",
      "Released",
      "Archived",
    ]

    const safeClassification =
      allowedClassification.includes(classification)
        ? classification
        : "Restricted"

    const safeStatus =
      allowedStatus.includes(status)
        ? status
        : "In Review"

    const sha256 = hashBuffer(req.file.buffer)

    const storedName =
      `${crypto.randomUUID()}${path.extname(req.file.originalname)}`

    const storagePath = path.join(
      UPLOAD_DIR,
      storedName,
    )

    try {
      await fs.promises.writeFile(
        storagePath,
        req.file.buffer,
      )

      const { rows } = await query(
        `INSERT INTO documents
         (
           name,
           case_id,
           doc_type,
           description,
           storage_path,
           original_name,
           mime_type,
           file_size,
           sha256_hash,
           classification,
           status,
           uploaded_by
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          req.file.originalname,
          caseId,
          docType,
          description || null,
          storagePath,
          req.file.originalname,
          req.file.mimetype,
          req.file.size,
          sha256,
          safeClassification,
          safeStatus,
          req.user.id,
        ],
      )

      const doc = rows[0]

      await query(
        `INSERT INTO document_versions
         (
           document_id,
           version_number,
           storage_path,
           original_name,
           mime_type,
           file_size,
           sha256_hash,
           created_by
         )
         VALUES ($1,1,$2,$3,$4,$5,$6,$7)`,
        [
          doc.id,
          storagePath,
          req.file.originalname,
          req.file.mimetype,
          req.file.size,
          sha256,
          req.user.id,
        ],
      )

      await logActivity({
        userId: req.user.id,
        action: "DOCUMENT_UPLOADED",
        targetType: "document",
        targetId: doc.id,
        detail: {
          caseId,
          docType,
          sha256,
          version: 1,
        },
        ip: req.ip,
      })

      return res.status(201).json({
        document: doc,
      })
    } catch (err) {
      fs.promises.unlink(storagePath).catch(() => {})

      console.error(
        "[documents/upload]",
        err.message,
      )

      return res.status(500).json({
        error: "Upload failed",
      })
    }
  },
)

// ============================================================
// LIST DOCUMENTS
// ============================================================

// Metadata is visible so users can request access.
// File contents are not.
router.get("/", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         d.id,
         d.name,
         d.case_id,
         d.doc_type,
         d.description,
         d.mime_type,
         d.file_size,
         d.sha256_hash,
         d.classification,
         d.status,
         d.created_at,
         d.updated_at,

         u.username AS uploaded_by_username,
         u.full_name AS uploaded_by_name,

         (
           d.uploaded_by=$1
           OR COALESCE(p.can_read,false)
           OR EXISTS(
             SELECT 1
             FROM users au
             WHERE au.id=$1
             AND au.role='admin'
           )
         ) AS can_read,

         (
           d.uploaded_by=$1
           OR COALESCE(p.can_write,false)
           OR EXISTS(
             SELECT 1
             FROM users au
             WHERE au.id=$1
             AND au.role='admin'
           )
         ) AS can_write

       FROM documents d
       JOIN users u
         ON u.id=d.uploaded_by

       LEFT JOIN document_permissions p
         ON p.document_id=d.id
        AND p.user_id=$1

       ORDER BY d.created_at DESC`,
      [req.user.id],
    )

    await logActivity({
      userId: req.user.id,
      action: "DOCUMENT_LIST_VIEWED",
      targetType: "document",
      detail: {
        count: rows.length,
      },
      ip: req.ip,
    })

    return res.json({
      documents: rows,
    })
  } catch (err) {
    console.error(
      "[documents/list]",
      err.message,
    )

    return res.status(500).json({
      error: "Failed to fetch documents",
    })
  }
})

// ============================================================
// ACCESS REQUEST
// ============================================================

// Any authenticated user may request read/write access.
router.post("/:id/access-request", async (req, res) => {
  const {
    accessType,
    reason,
  } = req.body || {}

  if (!["read", "write"].includes(accessType)) {
    return res.status(400).json({
      error: "accessType must be read or write",
    })
  }

  const { rows: docs } = await query(
    `SELECT id, uploaded_by
     FROM documents
     WHERE id=$1`,
    [req.params.id],
  )

  if (!docs[0]) {
    return res.status(404).json({
      error: "Document not found",
    })
  }

  const { rows: existing } = await query(
    `SELECT id
     FROM document_access_requests
     WHERE document_id=$1
       AND requester_id=$2
       AND access_type=$3
       AND status='pending'`,
    [
      req.params.id,
      req.user.id,
      accessType,
    ],
  )

  if (existing[0]) {
    return res.status(409).json({
      error: "A pending request already exists",
    })
  }

  const { rows } = await query(
    `INSERT INTO document_access_requests
     (
       document_id,
       requester_id,
       access_type,
       reason
     )
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [
      req.params.id,
      req.user.id,
      accessType,
      reason || null,
    ],
  )

  await logActivity({
    userId: req.user.id,
    action: "ACCESS_REQUESTED",
    targetType: "document",
    targetId: req.params.id,
    detail: {
      accessType,
      requestId: rows[0].id,
    },
    ip: req.ip,
  })

  return res.status(201).json({
    request: rows[0],
  })
})

// ============================================================
// PENDING ACCESS REQUESTS
// ============================================================

// Admin can see all pending requests.
// Officer can see only requests for their own documents.
router.get(
  "/access-requests/pending",
  requireRole("admin", "officer"),
  async (req, res) => {
    try {
      const { rows } = await query(
        `SELECT
           r.id,
           r.document_id,
           r.requester_id,
           r.access_type,
           r.reason,
           r.status,
           r.created_at,

           d.name AS document_name,

           u.username AS requester_username,
           u.full_name AS requester_name

         FROM document_access_requests r

         JOIN documents d
           ON d.id = r.document_id

         JOIN users u
           ON u.id = r.requester_id

         WHERE r.status = 'pending'
           AND (
             $1 = 'admin'
             OR d.uploaded_by = $2
           )

         ORDER BY r.created_at ASC`,
        [
          req.user.role,
          req.user.id,
        ],
      )

      return res.json({
        requests: rows,
      })
    } catch (err) {
      console.error(
        "[access-requests/pending]",
        err.message,
      )

      return res.status(500).json({
        error: "Failed to fetch pending requests",
      })
    }
  },
)

// ============================================================
// GET SINGLE DOCUMENT
// ============================================================

router.get("/:id", async (req, res) => {
  if (
    !await requireDocumentAccess(
      req,
      res,
      req.params.id,
      "read",
    )
  ) {
    return
  }

  const { rows } = await query(
    `SELECT *
     FROM documents
     WHERE id=$1`,
    [req.params.id],
  )

  const doc = rows[0]

  await logActivity({
    userId: req.user.id,
    action: "DOCUMENT_VIEWED",
    targetType: "document",
    targetId: doc.id,
    ip: req.ip,
  })

  return res.json({
    document: doc,
  })
})

// ============================================================
// APPROVE / REJECT ACCESS REQUEST
// ============================================================

// Admin can manage all requests.
// Officer can manage requests only for their own documents.
router.patch(
  "/access-requests/:requestId",
  requireRole("admin", "officer"),
  async (req, res) => {
    const { decision } = req.body || {}

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({
        error: "decision must be approved or rejected",
      })
    }

    const clientResult = await query(
      `SELECT
         r.id,
         r.document_id,
         r.requester_id,
         r.access_type,
         r.status,
         d.uploaded_by

       FROM document_access_requests r

       JOIN documents d
         ON d.id = r.document_id

       WHERE r.id = $1`,
      [req.params.requestId],
    )

    const request = clientResult.rows[0]

    if (!request) {
      return res.status(404).json({
        error: "Access request not found",
      })
    }

    // Officer can only manage requests
    // belonging to their own documents.
    if (
      req.user.role === "officer" &&
      request.uploaded_by !== req.user.id
    ) {
      return res.status(403).json({
        error:
          "You can only manage access requests for your own documents",
      })
    }

    if (request.status !== "pending") {
      return res.status(409).json({
        error: "Request has already been reviewed",
      })
    }

    // If approved, grant the requested permission.
    if (decision === "approved") {
      await query(
        `INSERT INTO document_permissions
         (
           document_id,
           user_id,
           can_read,
           can_write,
           granted_by
         )
         VALUES ($1, $2, $3, $4, $5)

         ON CONFLICT (document_id, user_id)

         DO UPDATE SET
           can_read =
             document_permissions.can_read
             OR EXCLUDED.can_read,

           can_write =
             document_permissions.can_write
             OR EXCLUDED.can_write,

           granted_by = EXCLUDED.granted_by,

           updated_at = now()`,
        [
          request.document_id,
          request.requester_id,
          true,
          request.access_type === "write",
          req.user.id,
        ],
      )
    }

    const { rows } = await query(
      `UPDATE document_access_requests

       SET
         status = $1,
         reviewed_by = $2,
         reviewed_at = now()

       WHERE id = $3
         AND status = 'pending'

       RETURNING *`,
      [
        decision,
        req.user.id,
        req.params.requestId,
      ],
    )

    if (!rows[0]) {
      return res.status(409).json({
        error: "Request has already been reviewed",
      })
    }

    await logActivity({
      userId: req.user.id,

      action:
        decision === "approved"
          ? "ACCESS_APPROVED"
          : "ACCESS_REJECTED",

      targetType: "document",

      targetId: request.document_id,

      detail: {
        requestId: request.id,
        requesterId: request.requester_id,
        accessType: request.access_type,
      },

      ip: req.ip,
    })

    return res.json({
      request: rows[0],
    })
  },
)

// ============================================================
// VERSION HISTORY
// ============================================================

// Version history is readable only with read permission.
router.get("/:id/versions", async (req, res) => {
  if (
    !await requireDocumentAccess(
      req,
      res,
      req.params.id,
      "read",
    )
  ) {
    return
  }

  const { rows } = await query(
    `SELECT
       v.id,
       v.version_number,
       v.original_name,
       v.mime_type,
       v.file_size,
       v.created_at,

       u.username AS created_by_username,
       u.full_name AS created_by_name,
       u.official_id AS created_by_official_id

     FROM document_versions v

     JOIN users u
       ON u.id=v.created_by

     WHERE v.document_id=$1

     ORDER BY v.version_number DESC`,
    [req.params.id],
  )

  return res.json({
    versions: rows,
  })
})

// ============================================================
// CREATE NEW VERSION
// ============================================================

// Only users with write permission can create a new version.
router.put(
  "/:id",
  upload.single("file"),
  async (req, res) => {
    if (
      !await requireDocumentAccess(
        req,
        res,
        req.params.id,
        "write",
      )
    ) {
      return
    }

    if (!req.file) {
      return res.status(400).json({
        error: "A file is required for a new version",
      })
    }

    const { rows: docs } = await query(
      `SELECT *
       FROM documents
       WHERE id=$1`,
      [req.params.id],
    )

    const doc = docs[0]

    const { rows: versionRows } = await query(
      `SELECT
         COALESCE(MAX(version_number),0)+1
         AS next_version
       FROM document_versions
       WHERE document_id=$1`,
      [doc.id],
    )

    const version = Number(
      versionRows[0].next_version,
    )

    const sha256 = hashBuffer(
      req.file.buffer,
    )

    const storedName =
      `${crypto.randomUUID()}${path.extname(req.file.originalname)}`

    const storagePath = path.join(
      UPLOAD_DIR,
      storedName,
    )

    try {
      await fs.promises.writeFile(
        storagePath,
        req.file.buffer,
      )

      await query(
        `INSERT INTO document_versions
         (
           document_id,
           version_number,
           storage_path,
           original_name,
           mime_type,
           file_size,
           sha256_hash,
           created_by
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          doc.id,
          version,
          storagePath,
          req.file.originalname,
          req.file.mimetype,
          req.file.size,
          sha256,
          req.user.id,
        ],
      )

      await query(
        `UPDATE documents
         SET
           name=$1,
           storage_path=$2,
           original_name=$3,
           mime_type=$4,
           file_size=$5,
           sha256_hash=$6,
           updated_at=now()
         WHERE id=$7`,
        [
          req.file.originalname,
          storagePath,
          req.file.originalname,
          req.file.mimetype,
          req.file.size,
          sha256,
          doc.id,
        ],
      )

      await logActivity({
        userId: req.user.id,
        action: "VERSION_CREATED",
        targetType: "document",
        targetId: doc.id,
        detail: {
          version,
          sha256,
        },
        ip: req.ip,
      })

      return res.status(201).json({
        documentId: doc.id,
        version,
        sha256,
      })
    } catch (err) {
      fs.promises.unlink(storagePath).catch(() => {})

      console.error(
        "[documents/version]",
        err.message,
      )

      return res.status(500).json({
        error: "Version creation failed",
      })
    }
  },
)

// ============================================================
// INTEGRITY VERIFICATION
// ============================================================

async function verifyIntegrity(doc, user, ip) {
  let computed = null
  let status = "verified"

  try {
    computed = await hashFile(
      doc.storage_path,
    )
  } catch {
    status = "missing_file"
  }

  const valid =
    status === "verified" &&
    hashesEqual(
      computed,
      doc.sha256_hash,
    )

  if (!valid) {
    await logActivity({
      userId: user.id,
      action: "INTEGRITY_FAILURE",
      targetType: "document",
      targetId: doc.id,
      detail: {
        expected: doc.sha256_hash,
        computed,
        reason:
          status === "missing_file"
            ? "file_missing"
            : "hash_mismatch",
      },
      ip,
    })
  }

  return {
    valid,
    expected: doc.sha256_hash,
    computed,
    reason: valid
      ? null
      : status === "missing_file"
        ? "file_missing"
        : "hash_mismatch",
  }
}

router.get("/:id/verify", async (req, res) => {
  if (
    !await requireDocumentAccess(
      req,
      res,
      req.params.id,
      "read",
    )
  ) {
    return
  }

  const { rows } = await query(
    `SELECT *
     FROM documents
     WHERE id=$1`,
    [req.params.id],
  )

  const result = await verifyIntegrity(
    rows[0],
    req.user,
    req.ip,
  )

  await logActivity({
    userId: req.user.id,
    action: "INTEGRITY_CHECK",
    targetType: "document",
    targetId: req.params.id,
    detail: {
      valid: result.valid,
    },
    ip: req.ip,
  })

  return res
    .status(result.valid ? 200 : 409)
    .json({
      documentId: req.params.id,
      ...result,
    })
})

// ============================================================
// DOWNLOAD DOCUMENT
// ============================================================

router.get("/:id/download", async (req, res) => {
  if (
    !await requireDocumentAccess(
      req,
      res,
      req.params.id,
      "read",
    )
  ) {
    return
  }

  const { rows } = await query(
    `SELECT *
     FROM documents
     WHERE id=$1`,
    [req.params.id],
  )

  const doc = rows[0]

  const result = await verifyIntegrity(
    doc,
    req.user,
    req.ip,
  )

  if (!result.valid) {
    return res.status(409).json({
      error:
        "Integrity check failed. Download blocked.",
      ...result,
    })
  }

  await logActivity({
    userId: req.user.id,
    action: "DOCUMENT_DOWNLOADED",
    targetType: "document",
    targetId: doc.id,
    detail: {
      sha256: doc.sha256_hash,
    },
    ip: req.ip,
  })

  res.setHeader(
    "Content-Type",
    doc.mime_type,
  )

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${doc.original_name.replace(/"/g, "")}"`,
  )

  res.setHeader(
    "X-Content-Sha256",
    doc.sha256_hash,
  )

  fs.createReadStream(
    doc.storage_path,
  ).pipe(res)
})

// ============================================================
// DELETE DOCUMENT
// ============================================================

// Delete document - owner only
router.delete("/:id", async (req, res) => {
  const { rows: docs } = await query(
    `SELECT *
     FROM documents
     WHERE id=$1`,
    [req.params.id],
  )

  const doc = docs[0]

  if (!doc) {
    return res.status(404).json({
      error: "Document not found",
    })
  }

  if (doc.uploaded_by !== req.user.id) {
    await logActivity({
      userId: req.user.id,
      action: "DELETE_DENIED",
      targetType: "document",
      targetId: req.params.id,
      detail: {
        documentOwner: doc.uploaded_by,
        attemptedBy: req.user.id,
      },
      ip: req.ip,
    })

    return res.status(403).json({
      error:
        "Only the document owner can delete this document",
    })
  }

  try {
    await fs.promises
      .unlink(doc.storage_path)
      .catch(() => {})

    const { rows: versions } = await query(
      `SELECT storage_path
       FROM document_versions
       WHERE document_id=$1`,
      [req.params.id],
    )

    for (const version of versions) {
      await fs.promises
        .unlink(version.storage_path)
        .catch(() => {})
    }

    await query(
      `DELETE FROM documents
       WHERE id=$1`,
      [req.params.id],
    )

    await logActivity({
      userId: req.user.id,
      action: "DOCUMENT_DELETED",
      targetType: "document",
      targetId: req.params.id,
      detail: {
        documentName: doc.name,
        caseId: doc.case_id,
        fileSize: doc.file_size,
      },
      ip: req.ip,
    })

    return res.json({
      success: true,
      message: "Document deleted successfully",
      documentId: req.params.id,
    })
  } catch (err) {
    console.error(
      "[documents/delete]",
      err.message,
    )

    return res.status(500).json({
      error: "Failed to delete document",
      details: err.message,
    })
  }
})

module.exports = router