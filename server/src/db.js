import { DuckDBInstance } from '@duckdb/node-api';
import { config } from './config.js';

let db;

export async function initDB() {
  db = await DuckDBInstance.create(config.dbPath);
  const conn = await db.connect();

  await conn.run(`
    CREATE TABLE IF NOT EXISTS users (
      atproto_did TEXT PRIMARY KEY,
      atproto_handle TEXT,
      matrix_mxid TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await conn.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      atproto_did TEXT REFERENCES users(atproto_did),
      matrix_access_token TEXT,
      atproto_session_data JSON,
      expires_at TIMESTAMP
    )
  `);

  // lexicon_prefixes stored as JSON text (DuckDB node-api can't bind typed arrays)
  await conn.run(`
    CREATE TABLE IF NOT EXISTS room_configs (
      room_id TEXT PRIMARY KEY,
      lexicon_prefixes TEXT DEFAULT '[]',
      allow_matrix_messages BOOLEAN DEFAULT TRUE,
      created_by TEXT REFERENCES users(atproto_did),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  conn.closeSync();
  console.log('Database initialized');
}

// Convenience query helpers — returns array of plain objects
export async function query(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const conn = await db.connect();
  try {
    const result = await conn.runAndReadAll(sql, params);
    return result.getRowObjects();
  } finally {
    conn.closeSync();
  }
}

export async function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const conn = await db.connect();
  try {
    await conn.run(sql, params);
  } finally {
    conn.closeSync();
  }
}
