const db = require('../db/database');

// ── List monitors ──────────────────────────────────────────────────────────

const listMonitors = (req, res) => {
  const monitors = db.prepare(`
    SELECT * FROM monitors WHERE org_id = ? ORDER BY created_at DESC
  `).all(req.session.orgId);

  res.json({ monitors });
};

// ── Create monitor ─────────────────────────────────────────────────────────

const createMonitor = (req, res) => {
  const { name, url, webhook_url, interval_seconds } = req.body;

  if (!name || !url) return res.status(400).json({ error: 'name and url are required' });

  try { new URL(url); } catch {
    return res.status(400).json({ error: 'url must be a valid URL (include http:// or https://)' });
  }

  const result = db.prepare(`
    INSERT INTO monitors (org_id, name, url, interval_seconds, webhook_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.session.orgId, name.trim(), url.trim(),
         interval_seconds ? parseInt(interval_seconds) : 60,
         webhook_url || null);

  const monitor = db.prepare('SELECT * FROM monitors WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ monitor });
};

// ── Delete monitor ─────────────────────────────────────────────────────────

const deleteMonitor = (req, res) => {
  const monitor = db.prepare(
    'SELECT id FROM monitors WHERE id = ? AND org_id = ?'
  ).get(req.params.id, req.session.orgId);

  if (!monitor) return res.status(404).json({ error: 'Monitor not found' });

  db.prepare('DELETE FROM monitors WHERE id = ?').run(req.params.id);
  res.json({ success: true });
};

// ── Ping history (for timeline bar) ───────────────────────────────────────

const getMonitorPings = (req, res) => {
  const monitor = db.prepare(
    'SELECT id FROM monitors WHERE id = ? AND org_id = ?'
  ).get(req.params.id, req.session.orgId);

  if (!monitor) return res.status(404).json({ error: 'Monitor not found' });

  const limit = Math.min(200, parseInt(req.query.limit) || 90);
  const pings = db.prepare(`
    SELECT status, response_time_ms, http_status_code, timestamp
    FROM ping_results WHERE monitor_id = ?
    ORDER BY timestamp DESC LIMIT ?
  `).all(req.params.id, limit).reverse(); // oldest-first for timeline rendering

  res.json({ pings });
};

// ── Page render ────────────────────────────────────────────────────────────

const showMonitors = (req, res) => {
  res.render('uptime/index', { title: 'Uptime Monitors', isUptime: true });
};

module.exports = { listMonitors, createMonitor, deleteMonitor, getMonitorPings, showMonitors };
