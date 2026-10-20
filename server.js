const express = require('express');
const pool = require('./db');

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

// 用户查询
app.get('/api/track/:no', async (req, res) => {
  try {
    const no = req.params.no.trim();
    const orderRes = await pool.query('SELECT * FROM orders WHERE tracking_no = $1', [no]);
    const order = orderRes.rows[0];
    if (!order) return res.status(404).json({ error: '未找到该运单' });

    const tracksRes = await pool.query(
      'SELECT time, info FROM tracks WHERE tracking_no = $1 ORDER BY time DESC',
      [no]
    );

    res.json({ order, tracks: tracksRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 管理端：新建/更新运单
app.post('/api/admin/order', auth, async (req, res) => {
  try {
    const { tracking_no, company, status } = req.body;
    if (!tracking_no) return res.status(400).json({ error: '缺少运单号' });

    await pool.query(`
      INSERT INTO orders (tracking_no, company, status, updated_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT(tracking_no) DO UPDATE SET
        company = EXCLUDED.company,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [tracking_no, company || '', status || '', new Date().toISOString()]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 管理端：追加物流
app.post('/api/admin/track', auth, async (req, res) => {
  try {
    const { tracking_no, time, info, status } = req.body;
    if (!tracking_no || !time || !info) {
      return res.status(400).json({ error: '参数不完整' });
    }

    const now = new Date().toISOString();
    
    // 插入物流记录
    await pool.query(
      'INSERT INTO tracks (tracking_no, time, info, created_at) VALUES ($1, $2, $3, $4)',
      [tracking_no, time, info, now]
    );

    // 更新订单状态
    await pool.query(`
      INSERT INTO orders (tracking_no, company, status, updated_at)
      VALUES ($1, '', $2, $3)
      ON CONFLICT(tracking_no) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [tracking_no, status || info, now]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ 服务已启动: http://localhost:${PORT}`));