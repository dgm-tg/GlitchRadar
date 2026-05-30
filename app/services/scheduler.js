const http    = require('http');
const https   = require('https');
const cron    = require('node-cron');
const db      = require('../db/database');
const email   = require('./email');
const webhook = require('./webhook');

// ── Ping a single URL ──────────────────────────────────────────────────────

function pingUrl(url) {
  return new Promise((resolve) => {
    const start  = Date.now();
    const client = url.startsWith('https') ? https : http;

    let settled = false;
    const done = (result) => {
      if (!settled) { settled = true; resolve(result); }
    };

    try {
      const req = client.get(url, { timeout: 10000 }, (res) => {
        res.resume();
        done({
          status:           res.statusCode < 400 ? 'up' : 'down',
          response_time_ms: Date.now() - start,
          http_status_code: res.statusCode,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        done({ status: 'down', response_time_ms: 10000, http_status_code: null });
      });

      req.on('error', () => {
        done({ status: 'down', response_time_ms: Date.now() - start, http_status_code: null });
      });
    } catch {
      done({ status: 'down', response_time_ms: Date.now() - start, http_status_code: null });
    }
  });
}

// ── Check one monitor ──────────────────────────────────────────────────────

async function checkMonitor(monitor) {
  const result = await pingUrl(monitor.url);
  const now    = new Date().toISOString();

  db.prepare(`
    INSERT INTO ping_results (monitor_id, status, response_time_ms, http_status_code, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(monitor.id, result.status, result.response_time_ms, result.http_status_code, now);

  const prevStatus    = monitor.last_status;
  const statusChanged = prevStatus !== result.status;

  db.prepare(`
    UPDATE monitors SET last_status = ?, last_checked_at = ?
    ${statusChanged ? ', status_changed_at = ?' : ''}
    WHERE id = ?
  `).run(
    result.status, now,
    ...(statusChanged ? [now] : []),
    monitor.id
  );

  // Send alerts on transition
  if (statusChanged && prevStatus !== null) {
    const orgEmails = db.prepare(`
      SELECT u.email FROM users u
      JOIN org_members m ON u.id = m.user_id
      WHERE m.org_id = ?
    `).all(monitor.org_id).map(r => r.email);

    const alertFn = result.status === 'down' ? email.sendDownAlert : email.sendRecoveryAlert;

    alertFn(orgEmails, monitor).catch(() => {});

    if (monitor.webhook_url) {
      webhook.sendAlert(monitor.webhook_url, {
        event:   result.status === 'down' ? 'monitor.down' : 'monitor.recovered',
        monitor: { id: monitor.id, name: monitor.name, url: monitor.url },
      }).catch(() => {});
    }
  }
}

// ── Main scheduler loop ────────────────────────────────────────────────────

function startScheduler() {
  cron.schedule('* * * * *', async () => {
    const monitors = db.prepare('SELECT * FROM monitors').all();
    if (!monitors.length) return;

    // Run in batches of 10 to avoid hammering the network
    const BATCH = 10;
    for (let i = 0; i < monitors.length; i += BATCH) {
      await Promise.allSettled(
        monitors.slice(i, i + BATCH).map(m => checkMonitor(m))
      );
    }
  });

  console.log('Uptime scheduler started');
}

module.exports = { startScheduler };
