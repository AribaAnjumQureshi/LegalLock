const { query } = require("../db/pool")

// Central place to append to the audit trail. Logging must never crash the
// request it is recording, so failures are caught and reported, not thrown.
async function logActivity({ userId = null, action, targetType = null, targetId = null, detail = {}, ip = null }) {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, action, target_type, target_id, detail, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, targetType, targetId, JSON.stringify(detail), ip],
    )
  } catch (err) {
    console.error("[activity] Failed to write audit log:", err.message)
  }
}

module.exports = { logActivity }
