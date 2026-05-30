const db = require('../db/database');

const VALID_LEVELS = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG'];

// ── Ingest ─────────────────────────────────────────────────────────────────

const ingestLog = (req, res) => {
  const { level, message, service, timestamp, metadata } = req.body;

  if (!message) return res.status(400).json({ error: 'message is required' });

  const lvl = level ? level.toUpperCase() : 'INFO';
  if (!VALID_LEVELS.includes(lvl)) {
    return res.status(400).json({ error: `level must be one of: ${VALID_LEVELS.join(', ')}` });
  }

  const ts = timestamp || new Date().toISOString();

  db.prepare(`
    INSERT INTO logs (project_id, level, message, service, metadata, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.projectId, lvl, message, service || null,
         metadata ? JSON.stringify(metadata) : null, ts);

  res.status(201).json({ success: true });
};

// ── List logs (cursor-based) ───────────────────────────────────────────────

const listLogs = (req, res) => {
  const { level, service, projectId, timeRange, search, cursor, limit = 50 } = req.query;

  const LIMIT  = Math.min(200, Math.max(1, parseInt(limit)));
  const conds  = ['p.org_id = ?'];
  const params = [req.session.orgId];

  if (cursor) { conds.push('l.id < ?'); params.push(parseInt(cursor)); }

  if (level && VALID_LEVELS.includes(level.toUpperCase())) {
    conds.push('l.level = ?');
    params.push(level.toUpperCase());
  }

  if (service)   { conds.push('l.service = ?');    params.push(service); }
  if (projectId) { conds.push('l.project_id = ?'); params.push(projectId); }

  if (timeRange === '1h') {
    conds.push("l.timestamp >= datetime('now', '-1 hour')");
  } else if (timeRange === '24h') {
    conds.push("l.timestamp >= datetime('now', '-24 hours')");
  } else if (timeRange === '7d') {
    conds.push("l.timestamp >= datetime('now', '-7 days')");
  }

  if (search) { conds.push('l.message LIKE ?'); params.push(`%${search}%`); }

  const WHERE = 'WHERE ' + conds.join(' AND ');

  const rows = db.prepare(`
    SELECT l.*, p.name AS project_name
    FROM logs l JOIN projects p ON l.project_id = p.id
    ${WHERE}
    ORDER BY l.id DESC
    LIMIT ?
  `).all(...params, LIMIT + 1);

  const hasMore   = rows.length > LIMIT;
  const logs      = hasMore ? rows.slice(0, LIMIT) : rows;
  const nextCursor = hasMore ? logs[logs.length - 1].id : null;

  res.json({ logs, nextCursor });
};

// ── Distinct services ──────────────────────────────────────────────────────

const listServices = (req, res) => {
  const services = db.prepare(`
    SELECT DISTINCT l.service
    FROM logs l JOIN projects p ON l.project_id = p.id
    WHERE p.org_id = ? AND l.service IS NOT NULL
    ORDER BY l.service
  `).all(req.session.orgId).map(r => r.service);

  res.json({ services });
};

// ── Page render ────────────────────────────────────────────────────────────

const showLogs = (req, res) => {
  res.render('logs/index', { title: 'Logs', isLogs: true });
};

module.exports = { ingestLog, listLogs, listServices, showLogs };
