const { Pool } = require("pg")

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and provide a PostgreSQL connection string.")
}

// A single shared pool for the whole process. `pg` handles connection reuse.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon and most managed Postgres require SSL. `sslmode=require` in the URL
  // covers it, but this keeps local/self-hosted setups working too.
  ssl: process.env.DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
})

async function query(text, params) {
  return pool.query(text, params)
}

module.exports = { pool, query }
