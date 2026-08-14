const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// Allow overriding the DB file (used by tests to run against an isolated,
// in-memory-like temp file instead of the real dev database).
const DB_PATH =
  process.env.TASKFLOW_DB_PATH || path.join(__dirname, "..", "data", "taskflow.db");

function createConnection(dbPath = DB_PATH) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  db.exec(schema);

  return db;
}

module.exports = { createConnection, DB_PATH };
