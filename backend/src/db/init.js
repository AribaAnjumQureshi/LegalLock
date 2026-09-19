// Applies schema.sql. Idempotent: safe to run repeatedly. Adds no data.
require("dotenv").config()
const fs = require("fs")
const path = require("path")
const { pool } = require("./pool")

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8")
  await pool.query(sql)
  console.log("[db:init] Schema applied. All tables are empty.")
  await pool.end()
}

main().catch((err) => {
  console.error("[db:init] Failed:", err.message)
  process.exit(1)
})
