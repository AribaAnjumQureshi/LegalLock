const crypto = require("crypto")
const fs = require("fs")

// Hash an in-memory buffer (used at upload time, before the file is written).
function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex")
}

// Hash a file on disk by streaming it, so large files never load fully into
// memory. Used at retrieval time to recompute the fingerprint.
function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256")
    const stream = fs.createReadStream(filePath)
    stream.on("error", reject)
    stream.on("data", (chunk) => hash.update(chunk))
    stream.on("end", () => resolve(hash.digest("hex")))
  })
}

// Constant-time comparison so an attacker cannot learn the expected hash by
// measuring how long a mismatch takes to reject.
function hashesEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false
  }
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"))
}

module.exports = { hashBuffer, hashFile, hashesEqual }
