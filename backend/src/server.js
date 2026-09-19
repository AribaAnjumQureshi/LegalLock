require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { authenticate, requireRole } = require("./middleware/auth")
const { query } = require("./db/pool")
const { logActivity } = require("./services/activity")
const authRoutes = require("./routes/auth")
const documentRoutes = require("./routes/documents")

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: "2mb" }))

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
  res.setHeader("X-Frame-Options", "DENY")
  next()
})

app.get("/health", (req, res) => res.json({ status: "ok", service: "LegalLock API" }))
app.use("/api/auth", authRoutes)
app.use("/api/documents", documentRoutes)

app.get("/api/auth/me", authenticate, async (req, res) => {
  const { rows } = await query(
    `SELECT id, username, email, full_name, official_id, role, is_active, face_encoding IS NOT NULL AS face_registered FROM users WHERE id=$1`,
    [req.user.id],
  )
  if (!rows[0]) return res.status(404).json({ error: "User not found" })
  return res.json({ user: rows[0] })
})

// Dashboard data comes from the database, not mock data.
app.get("/api/dashboard", authenticate, async (req, res) => {
  const { rows: stats } = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM documents) AS total_documents,
      (SELECT COUNT(*)::int FROM documents WHERE status='Sealed' OR classification='Confidential') AS sealed_confidential,
      (SELECT COUNT(*)::int FROM documents WHERE status='In Review') AS pending_review,
      (SELECT COUNT(*)::int FROM activity_logs
       WHERE action='ACCESS_DENIED' AND created_at >= now() - interval '24 hours') AS access_denied
  `)
  const { rows: recent } = await query(`
    SELECT d.id, d.name, d.case_id, d.doc_type, d.classification, d.status, d.file_size,
           d.sha256_hash, d.created_at, d.updated_at, u.username AS uploaded_by_username
    FROM documents d JOIN users u ON u.id=d.uploaded_by
    ORDER BY d.created_at DESC LIMIT 5
  `)
  return res.json({ stats: stats[0], recent })
})

// Admin: review access requests.
app.get("/api/access-requests", authenticate, requireRole("admin"), async (req, res) => {
  const { rows } = await query(`
    SELECT r.id, r.document_id, r.access_type, r.reason, r.status, r.created_at, r.reviewed_at,
           u.username AS requester_username, u.email AS requester_email,
           d.name AS document_name, d.case_id
    FROM document_access_requests r
    JOIN users u ON u.id=r.requester_id
    JOIN documents d ON d.id=r.document_id
    ORDER BY r.created_at DESC
  `)
  return res.json({ requests: rows })
})

app.patch("/api/access-requests/:id", authenticate, requireRole("admin"), async (req, res) => {
  const { status } = req.body || {}
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "status must be approved or rejected" })
  }

  const client = await require("./db/pool").pool.connect()
  try {
    await client.query("BEGIN")
    const { rows } = await client.query(
      `SELECT * FROM document_access_requests WHERE id=$1 FOR UPDATE`,
      [req.params.id],
    )
    const request = rows[0]
    if (!request) {
      await client.query("ROLLBACK")
      return res.status(404).json({ error: "Access request not found" })
    }
    if (request.status !== "pending") {
      await client.query("ROLLBACK")
      return res.status(409).json({ error: "Request has already been reviewed" })
    }

    await client.query(
      `UPDATE document_access_requests SET status=$1, reviewed_by=$2, reviewed_at=now() WHERE id=$3`,
      [status, req.user.id, request.id],
    )

    if (status === "approved") {
      await client.query(
        `INSERT INTO document_permissions (document_id,user_id,can_read,can_write,granted_by)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (document_id,user_id) DO UPDATE SET
           can_read = document_permissions.can_read OR EXCLUDED.can_read,
           can_write = document_permissions.can_write OR EXCLUDED.can_write,
           granted_by=EXCLUDED.granted_by, updated_at=now()`,
        [request.document_id, request.requester_id, true, request.access_type === "write", req.user.id],
      )
    }

    await client.query("COMMIT")
    await logActivity({
      userId: req.user.id,
      action: status === "approved" ? "ACCESS_APPROVED" : "ACCESS_REJECTED",
      targetType: "document",
      targetId: request.document_id,
      detail: { requestId: request.id, accessType: request.access_type },
      ip: req.ip,
    })
    return res.json({ success: true, status })
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("[access-request/review]", err.message)
    return res.status(500).json({ error: "Failed to review access request" })
  } finally {
    client.release()
  }
})

// User's own requests.
app.get("/api/my-access-requests", authenticate, async (req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.document_id, r.access_type, r.reason, r.status, r.created_at,
            d.name AS document_name, d.case_id
     FROM document_access_requests r JOIN documents d ON d.id=r.document_id
     WHERE r.requester_id=$1 ORDER BY r.created_at DESC`,
    [req.user.id],
  )
  return res.json({ requests: rows })
})

// Admin-only audit trail.
app.get("/api/activity", authenticate, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500)
  const isAdmin = req.user.role === "admin"
  const { rows } = await query(
    `SELECT a.id, a.action, a.target_type, a.target_id, a.detail, a.ip_address, a.created_at,
            u.username AS actor_username, u.full_name AS actor_name, u.email AS actor_email,
            u.role AS actor_role
     FROM activity_logs a LEFT JOIN users u ON u.id=a.user_id
     WHERE ($2::boolean = true OR a.user_id=$1)
     ORDER BY a.created_at DESC LIMIT $3`,
    [req.user.id, isAdmin, limit],
  )
  return res.json({ activity: rows })
})

app.use((req, res) => res.status(404).json({ error: "Not found" }))

const port = Number(process.env.PORT) || 4000
app.listen(port, () => console.log(`[server] LegalLock API listening on :${port}`))
