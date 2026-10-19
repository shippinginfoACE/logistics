console.log('>>> server.js 开始加载');

const express = require('express');
const db = require('./db');
console.log('db类型:',typeof db,'有prepare吗:',typeof db.prepare)

const app = express();
app.use(express.json());
app.use(express.static('public'));

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me-123456';

function auth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: '未授权' });
  }
  next();
}

app.get('/api/track/:no', (req, res) => {
  const no = req.params.no.trim();
  const order = db.prepare('SELECT * FROM orders WHERE tracking_no = ?').get(no);
  if (!order) return res.status(404).json({ error: '未找到该运单' });

  const tracks = db.prepare(
    'SELECT time, info FROM tracks WHERE tracking_no = ? ORDER BY time DESC'
  ).all(no);

  res.json({ order, tracks });
});

app.post('/api/admin/order', auth, (req, res) => {
  const { tracking_no, company, status } = req.body;
  if (!tracking_no) return res.status(400).json({ error: '缺少运单号' });

  db.prepare(`
    INSERT INTO orders (tracking_no, company, status, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(tracking_no) DO UPDATE SET
      company = excluded.company,
      status = excluded.status,
      updated_at = excluded.updated_at
  `).run(tracking_no, company || '', status || '', new Date().toISOString());

  res.json({ ok: true });
});

app.post('/api/admin/track', auth, (req, res) => {
  const { tracking_no, time, info, status } = req.body;
  if (!tracking_no || !time || !info) {
    return res.status(400).json({ error: '参数不完整' });
  }

  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO tracks (tracking_no, time, info, created_at) VALUES (?,?,?,?)'
  ).run(tracking_no, time, info, now);

  db.prepare(`
    INSERT INTO orders (tracking_no, company, status, updated_at)
    VALUES (?, '', ?, ?)
    ON CONFLICT(tracking_no) DO UPDATE SET
      status = excluded.status,
      updated_at = excluded.updated_at
  `).run(tracking_no, status || info, now);

  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ 服务已启动: http://localhost:${PORT}`));

// 兜底：捕获未处理的异常，强制打印
process.on('uncaughtException', (err) => {
  console.error('❌ 未捕获异常:', err);
});