const db = require('../db/database');

// ── Ingest ─────────────────────────────────────────────────────────────────

const ingestTransaction = (req, res) => {
  const { name, http_method, duration_ms, status_code, environment, timestamp } = req.body;

  if (!name)                                    return res.status(400).json({ error: 'name is required' });
  if (duration_ms === undefined || duration_ms === null) return res.status(400).json({ error: 'duration_ms is required' });

  const ts = timestamp || new Date().toISOString();

  db.prepare(`
    INSERT INTO transactions (project_id, name, http_method, duration_ms, status_code, environment, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.projectId,
    name,
    http_method  || null,
    parseFloat(duration_ms),
    status_code  ? parseInt(status_code) : null,
    environment  || 'production',
    ts
  );

  res.status(201).json({ success: true });
};

// ── Transaction groups (aggregated) ───────────────────────────────────────

const listGroups = (req, res) => {
  const { environment, projectId, sort } = req.query;

  const conds  = ['p.org_id = ?'];
  const params = [req.session.orgId];

  if (environment) { conds.push('t.environment = ?'); params.push(environment); }
  if (projectId)   { conds.push('t.project_id = ?'); params.push(projectId); }

  const ORDER = sort === 'fastest' ? 'avg_duration ASC' : 'avg_duration DESC';
  const WHERE = 'WHERE ' + conds.join(' AND ');

  const groups = db.prepare(`
    SELECT
      t.name,
      p.name        AS project_name,
      t.project_id,
      COUNT(*)      AS transaction_count,
      ROUND(AVG(t.duration_ms), 2) AS avg_duration,
      MIN(t.duration_ms)           AS min_duration,
      MAX(t.duration_ms)           AS max_duration
    FROM transactions t
    JOIN projects p ON t.project_id = p.id
    ${WHERE}
    GROUP BY t.name, t.project_id
    ORDER BY ${ORDER}
  `).all(...params);

  res.json({ groups });
};

// ── Individual transactions (for detail view) ──────────────────────────────

const listTransactions = (req, res) => {
  const { name, page = 1, limit = 50 } = req.query;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const PAGE   = Math.max(1, parseInt(page));
  const LIMIT  = Math.min(100, Math.max(1, parseInt(limit)));
  const OFFSET = (PAGE - 1) * LIMIT;

  const transactions = db.prepare(`
    SELECT t.*
    FROM transactions t JOIN projects p ON t.project_id = p.id
    WHERE p.org_id = ? AND t.name = ?
    ORDER BY t.timestamp DESC
    LIMIT ? OFFSET ?
  `).all(req.session.orgId, name, LIMIT, OFFSET);

  const { count: total } = db.prepare(`
    SELECT COUNT(*) AS count
    FROM transactions t JOIN projects p ON t.project_id = p.id
    WHERE p.org_id = ? AND t.name = ?
  `).get(req.session.orgId, name);

  res.json({ transactions, total, page: PAGE, limit: LIMIT });
};

// ── Page renders ───────────────────────────────────────────────────────────

const showGroupList = (req, res) => {
  res.render('performance/list', { title: 'Performance', isPerf: true });
};

const showDetail = (req, res) => {
  res.render('performance/detail', { title: 'Transaction Detail', isPerf: true });
};

module.exports = {
  ingestTransaction,
  listGroups,
  listTransactions,
  showGroupList,
  showDetail,
};
