const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        tracking_no TEXT PRIMARY KEY,
        company TEXT,
        status TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS tracks (
        id SERIAL PRIMARY KEY,
        tracking_no TEXT NOT NULL,
        time TEXT NOT NULL,
        info TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tracks_no ON tracks(tracking_no);
    `);
    console.log('数据库表初始化成功');
  } catch (err) {
    console.error('数据库初始化失败:', err);
  }
}

initDb();

module.exports = pool;