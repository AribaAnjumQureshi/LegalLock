const jwt = require("jsonwebtoken")
const { logActivity } = require("../services/activity")

function authenticate(req, res, next) {
  const header = req.headers.authorization || ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: "Authentication required" })

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role,
    }
    next()
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" })
  }
}

function requireRole(...allowed) {
  return async (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      await logActivity({
        userId: req.user?.id || null,
        action: "ACCESS_DENIED",
        targetType: "route",
        targetId: req.originalUrl,
        detail: { requiredRoles: allowed, actualRole: req.user?.role || null },
        ip: req.ip,
      })
      return res.status(403).json({ error: "Insufficient role for this action" })
    }
    next()
  }
}

module.exports = { authenticate, requireRole }
