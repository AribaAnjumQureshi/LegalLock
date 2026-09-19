const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { query } = require("../db/pool")
const { logActivity } = require("../services/activity")

const router = express.Router()
const MAX_LOGIN_ATTEMPTS = 3
const LOGIN_WINDOW_MINUTES = 60

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
  )
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    official_id: user.official_id,
    role: user.role,
    is_active: user.is_active,
    face_registered: Boolean(user.face_registered),
  }
}

function normaliseOfficialId(value) {
  return String(value || "").trim().toUpperCase()
}

function validateOfficialId(officialId) {
  const id = normaliseOfficialId(officialId)
  const pattern = process.env.OFFICIAL_ID_REGEX
  if (!id) return { ok: false, error: "Government/Official ID is required" }
  if (id.length < 4 || id.length > 40) return { ok: false, error: "Invalid Government/Official ID" }
  if (pattern) {
    try {
      if (!new RegExp(pattern).test(id)) return { ok: false, error: "Government/Official ID format is invalid" }
    } catch {
      console.error("[auth] Invalid OFFICIAL_ID_REGEX configuration")
    }
  }
  return { ok: true, id }
}

async function faceService(path, faceImage) {
  const baseUrl = process.env.FACE_SERVICE_URL
  if (!baseUrl) throw new Error("Face verification service is not configured")
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: faceImage }),
  })
  const text = await response.text()
  let data = {}
  try { data = text ? JSON.parse(text) : {} } catch { data = { error: text } }
  if (!response.ok) throw new Error(data.error || "Face verification service failed")
  return data
}

async function recentFailedAttempts(userId, username, email) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count
     FROM activity_logs
     WHERE action='LOGIN_FAILED'
       AND created_at >= now() - make_interval(mins => $1::int)
       AND (($2::uuid IS NOT NULL AND user_id=$2) OR (user_id IS NULL AND detail->>'username'=$3 AND detail->>'email'=$4))`,
    [LOGIN_WINDOW_MINUTES, userId || null, username.trim(), email.toLowerCase().trim()],
  )
  return rows[0]?.count || 0
}

async function registerFailure({ user, username, email, reason, ip }) {
  await logActivity({
    userId: user?.id || null,
    action: "LOGIN_FAILED",
    detail: { username, email, reason },
    ip,
  })
  const attempts = await recentFailedAttempts(user?.id, username, email)
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    await logActivity({
      userId: user?.id || null,
      action: "SECURITY_ALERT",
      detail: { type: "EXCESSIVE_LOGIN_FAILURES", attempts, windowMinutes: LOGIN_WINDOW_MINUTES },
      ip,
    })
  }
  return attempts
}

router.post("/register", async (req, res) => {
  const { username, email, password, fullName, officialId, faceImage } = req.body || {}
  if (!username || !email || !password || !fullName || !officialId || !faceImage) {
    return res.status(400).json({ error: "Full name, username, official email, Government/Official ID, password, and face verification are required" })
  }
  if (username.trim().length < 3) return res.status(400).json({ error: "Username must be at least 3 characters" })
  if (password.length < 10) return res.status(400).json({ error: "Password must be at least 10 characters" })
  const idCheck = validateOfficialId(officialId)
  if (!idCheck.ok) return res.status(400).json({ error: idCheck.error })

  try {
    const countResult = await query("SELECT COUNT(*)::int AS count FROM users")
    const firstAccount = countResult.rows[0].count === 0
    const role =
      firstAccount &&
      process.env.BOOTSTRAP_ADMIN_EMAIL &&
      email.toLowerCase() === process.env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase()
        ? "admin"
        : "officer"

    const face = await faceService("/encode", faceImage)
    if (!face.encoding) return res.status(422).json({ error: "Face could not be registered. Please try again with your face clearly visible." })

    const passwordHash = await bcrypt.hash(password, 12)
    const { rows } = await query(
      `INSERT INTO users (username, email, password_hash, full_name, official_id, face_encoding, role)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, username, email, full_name, official_id, role, is_active, face_encoding IS NOT NULL AS face_registered`,
      [username.trim(), email.toLowerCase().trim(), passwordHash, fullName.trim(), idCheck.id, JSON.stringify(face.encoding), role],
    )
    const user = rows[0]
    await logActivity({ userId: user.id, action: "USER_REGISTERED", targetType: "user", targetId: user.id, detail: { faceVerified: true }, ip: req.ip })
    return res.status(201).json({ user: publicUser(user), token: issueToken(user) })
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Username, email, or Government/Official ID already registered" })
    console.error("[auth/register]", err.message)
    return res.status(500).json({ error: err.message === "Face verification service is not configured" ? "Face verification service is not configured" : "Registration failed" })
  }
})

router.post("/login", async (req, res) => {
  const { username, email, password, faceImage } = req.body || {}
  if (!username || !email || !password || !faceImage) {
    return res.status(400).json({ error: "Username, email, password, and face verification are required" })
  }

  try {
    const priorAttempts = await recentFailedAttempts(null, username, email)
    if (priorAttempts >= MAX_LOGIN_ATTEMPTS) {
      await logActivity({
        userId: null,
        action: "SECURITY_ALERT",
        detail: { type: "LOGIN_BLOCKED", attempts: priorAttempts, windowMinutes: LOGIN_WINDOW_MINUTES, username, email },
        ip: req.ip,
      })
      return res.status(429).json({ error: "Too many failed login attempts. Please try again later.", securityAlert: true })
    }

    const { rows } = await query(
      `SELECT id, username, email, full_name, official_id, role, password_hash, is_active, face_encoding
       FROM users WHERE username = $1 AND email = $2`,
      [username.trim(), email.toLowerCase().trim()],
    )
    const user = rows[0]
    if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) {
      const attempts = await registerFailure({ user, username, email, reason: "INVALID_CREDENTIALS", ip: req.ip })
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        return res.status(429).json({ error: "Too many failed login attempts. Please try again later.", securityAlert: true })
      }
      return res.status(401).json({ error: "Invalid credentials" })
    }

    if (!user.face_encoding) {
      await registerFailure({ user, username, email, reason: "FACE_NOT_REGISTERED", ip: req.ip })
      return res.status(403).json({ error: "Face verification is not registered for this account" })
    }

    let faceResult
    try {
      faceResult = await faceService("/verify", { image: faceImage, encoding: user.face_encoding })
    } catch (err) {
      await logActivity({ userId: user.id, action: "FACE_VERIFICATION_ERROR", detail: { message: err.message }, ip: req.ip })
      return res.status(503).json({ error: "Face verification service is unavailable" })
    }
    if (!faceResult.verified) {
      const attempts = await registerFailure({ user, username, email, reason: "FACE_VERIFICATION_FAILED", ip: req.ip })
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        return res.status(429).json({ error: "Too many failed login attempts. Please try again later.", securityAlert: true })
      }
      return res.status(401).json({ error: "Face verification failed" })
    }

    await logActivity({ userId: user.id, action: "LOGIN_SUCCESS", targetType: "user", targetId: user.id, detail: { faceVerified: true }, ip: req.ip })
    return res.json({ user: publicUser(user), token: issueToken(user) })
  } catch (err) {
    console.error("[auth/login]", err.message)
    return res.status(500).json({ error: "Login failed" })
  }
})

module.exports = router
