const db = require('../db/database');
const { computeFingerprint } = require('../services/fingerprint');

// ── Ingest ─────────────────────────────────────────────────────────────────

const ingestError = (req, res) => {
  const { message, stack_trace, environment, level, timestamp, metadata } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const fingerprint = computeFingerprint(message, stack_trace);
  const ts  = timestamp || new Date().toISOString();
  const lvl = (level || 'error').toLowerCase();
  const env = environment || 'production';

  const upsert = db.transaction(() => {
    let issue = db.prepare(
      'SELECT id FROM issues WHERE project_id = ? AND fingerprint = ?'
    ).get(req.projectId, fingerprint);

    if (!issue) {
      const title  = message.split('\n')[0].slice(0, 255);
      const result = db.prepare(`
        INSERT INTO issues (project_id, fingerprint, title, level, environment, first_seen, last_seen, event_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `).run(req.projectId, fingerprint, title, lvl, env, ts, ts);
      issue = { id: result.lastInsertRowid };
    } else {
      db.prepare('UPDATE issues SET event_count = event_count + 1, last_seen = ? WHERE id = ?').run(ts, issue.id);
    }

    db.prepare(`
      INSERT INTO error_events (issue_id, message, stack_trace, environment, level, metadata, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(issue.id, message, stack_trace || null, env, lvl,
           metadata ? JSON.stringify(metadata) : null, ts);

    return issue.id;
  });

  res.status(201).json({ issueId: upsert() });
};

// ── Issues list (JSON) ─────────────────────────────────────────────────────

const listIssues = (req, res) => {
  const { status, environment, timeRange, sort, search, page = 1, limit = 25 } = req.query;

  const PAGE   = Math.max(1, parseInt(page));
  const LIMIT  = Math.min(100, Math.max(1, parseInt(limit)));
  const OFFSET = (PAGE - 1) * LIMIT;

  const conds  = ['p.org_id = ?'];
  const params = [req.session.orgId];

  const validStatus = ['unresolved', 'resolved', 'ignored'];
  conds.push('i.status = ?');
  params.push(validStatus.includes(status) ? status : 'unresolved');

  if (environment) { conds.push('i.environment = ?'); params.push(environment); }

  if (timeRange === '24h') {
    conds.push("i.last_seen >= datetime('now', '-24 hours')");
  } else if (timeRange === '14d') {
    conds.push("i.last_seen >= datetime('now', '-14 days')");
  }

  if (search) { conds.push('i.title LIKE ?'); params.push(`%${search}%`); }

  const sortMap = {
    last_seen:   'i.last_seen DESC',
    first_seen:  'i.first_seen DESC',
    event_count: 'i.event_count DESC',
  };
  const ORDER = sortMap[sort] || 'i.last_seen DESC';
  const WHERE = 'WHERE ' + conds.join(' AND ');

  const issues = db.prepare(`
    SELECT i.*, p.name AS project_name
    FROM issues i JOIN projects p ON i.project_id = p.id
    ${WHERE} ORDER BY ${ORDER} LIMIT ? OFFSET ?
  `).all(...params, LIMIT, OFFSET);

  const { count: total } = db.prepare(`
    SELECT COUNT(*) AS count FROM issues i JOIN projects p ON i.project_id = p.id ${WHERE}
  `).get(...params);

  // Fetch sparkline trend data for visible issues in one query
  const trends = {};
  if (issues.length) {
    const ids     = issues.map(i => i.id);
    const holder  = ids.map(() => '?').join(',');
    const rows    = db.prepare(`
      SELECT issue_id, date(timestamp) AS day, COUNT(*) AS count
      FROM error_events
      WHERE issue_id IN (${holder}) AND timestamp >= date('now', '-14 days')
      GROUP BY issue_id, day ORDER BY day
    `).all(...ids);
    for (const row of rows) {
      (trends[row.issue_id] = trends[row.issue_id] || []).push({ day: row.day, count: row.count });
    }
  }

  res.json({
    issues: issues.map(i => ({ ...i, trend: trends[i.id] || [] })),
    total,
    page: PAGE,
    limit: LIMIT,
  });
};

// ── Issue detail (JSON) ────────────────────────────────────────────────────

const getIssue = (req, res) => {
  const issue = db.prepare(`
    SELECT i.*, p.name AS project_name, p.org_id
    FROM issues i JOIN projects p ON i.project_id = p.id WHERE i.id = ?
  `).get(req.params.id);

  if (!issue || issue.org_id !== req.session.orgId) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  const events = db.prepare(`
    SELECT * FROM error_events WHERE issue_id = ? ORDER BY timestamp DESC LIMIT 50
  `).all(issue.id);

  res.json({ issue, events });
};

// ── Status update ──────────────────────────────────────────────────────────

const updateIssueStatus = (req, res) => {
  const { status } = req.body;
  const valid = ['unresolved', 'resolved', 'ignored'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const issue = db.prepare(`
    SELECT i.id FROM issues i JOIN projects p ON i.project_id = p.id
    WHERE i.id = ? AND p.org_id = ?
  `).get(req.params.id, req.session.orgId);

  if (!issue) return res.status(404).json({ error: 'Issue not found' });

  db.prepare('UPDATE issues SET status = ? WHERE id = ?').run(status, issue.id);
  res.json({ success: true });
};

// ── Bulk update ────────────────────────────────────────────────────────────

const bulkUpdateIssues = (req, res) => {
  const { ids, action } = req.body;

  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ error: 'ids must be a non-empty array' });
  }
  const validActions = ['resolve', 'unresolve', 'ignore', 'merge'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const holder = ids.map(() => '?').join(',');
  const owned  = db.prepare(`
    SELECT i.id FROM issues i JOIN projects p ON i.project_id = p.id
    WHERE i.id IN (${holder}) AND p.org_id = ?
  `).all(...ids, req.session.orgId).map(r => r.id);

  if (!owned.length) return res.status(404).json({ error: 'No matching issues found' });

  const ownedHolder = owned.map(() => '?').join(',');

  if (action === 'merge') {
    const [primary, ...rest] = owned;
    if (rest.length) {
      db.transaction(() => {
        const restHolder = rest.map(() => '?').join(',');
        db.prepare(`UPDATE error_events SET issue_id = ? WHERE issue_id IN (${restHolder})`).run(primary, ...rest);
        db.prepare(`UPDATE issues SET event_count = (SELECT COUNT(*) FROM error_events WHERE issue_id = ?) WHERE id = ?`).run(primary, primary);
        db.prepare(`DELETE FROM issues WHERE id IN (${restHolder})`).run(...rest);
      })();
    }
  } else {
    const statusMap = { resolve: 'resolved', unresolve: 'unresolved', ignore: 'ignored' };
    db.prepare(`UPDATE issues SET status = ? WHERE id IN (${ownedHolder})`).run(statusMap[action], ...owned);
  }

  res.json({ success: true, affected: owned.length });
};

// ── Page renders ───────────────────────────────────────────────────────────

const showIssueList = (req, res) => {
  res.render('issues/list', { title: 'Issues', isErrors: true });
};

const showIssueDetail = (req, res) => {
  const issue = db.prepare(`
    SELECT i.id, i.title, p.org_id FROM issues i
    JOIN projects p ON i.project_id = p.id WHERE i.id = ?
  `).get(req.params.id);

  if (!issue || issue.org_id !== req.session.orgId) {
    return res.status(404).send('Issue not found');
  }
  res.render('issues/detail', { title: issue.title, isErrors: true, issueId: issue.id });
};

module.exports = {
  ingestError,
  listIssues,
  getIssue,
  updateIssueStatus,
  bulkUpdateIssues,
  showIssueList,
  showIssueDetail,
};
