const Database = require('better-sqlite3');

const dbPath = process.env.RENDER ? '/data/data.db' : 'data.db';
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    tracking_no TEXT PRIMARY KEY,
    company TEXT,
    status TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracking_no TEXT NOT NULL,
    time TEXT NOT NULL,
    info TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tracks_no ON tracks(tracking_no);
`);

module.exports = db;