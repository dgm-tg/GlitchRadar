(function () {
  const container = document.getElementById('issue-detail');
  if (!container) return;

  const issueId = container.dataset.id;

  // ── Fetch ────────────────────────────────────────────────────────────────
  async function load() {
    try {
      const res  = await fetch(`/issues/${issueId}/data`);
      if (!res.ok) throw new Error('Not found');
      const { issue, events } = await res.json();
      renderHeader(issue);
      renderStackTrace(events[0]);
      renderEvents(events);
    } catch {
      document.getElementById('stack-trace').textContent = 'Failed to load issue.';
    }
  }

  // ── Header ────────────────────────────────────────────────────────────────
  function renderHeader(issue) {
    document.getElementById('issue-title').textContent  = issue.title;
    document.getElementById('issue-project').textContent = issue.project_name;
    document.getElementById('issue-env').textContent     = issue.environment ? `· ${issue.environment}` : '';
    document.getElementById('stat-count').textContent    = issue.event_count.toLocaleString();
    document.getElementById('stat-first').textContent    = formatDate(issue.first_seen);
    document.getElementById('stat-last').textContent     = formatDate(issue.last_seen);

    const badge = document.getElementById('issue-status-badge');
    badge.className = `badge badge-${issue.status}`;
    badge.textContent = issue.status;

    document.getElementById('btn-resolve').addEventListener('click', () => updateStatus(issue.id, 'resolved'));
    document.getElementById('btn-ignore').addEventListener('click',  () => updateStatus(issue.id, 'ignored'));
  }

  // ── Stack trace ───────────────────────────────────────────────────────────
  function renderStackTrace(event) {
    const el = document.getElementById('stack-trace');
    if (!event) { el.textContent = 'No events recorded.'; return; }
    el.textContent = event.stack_trace || event.message || 'No stack trace available.';
  }

  // ── Events table ──────────────────────────────────────────────────────────
  function renderEvents(events) {
    const tbody = document.getElementById('events-tbody');
    if (!events.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8" style="color:var(--color-text-muted)">No events.</td></tr>';
      return;
    }

    tbody.innerHTML = events.map(ev => {
      const meta = ev.metadata ? (() => { try { return JSON.parse(ev.metadata); } catch { return null; } })() : null;
      return `
        <tr>
          <td class="text-xs" style="color:var(--color-text-muted);white-space:nowrap">${formatDate(ev.timestamp)}</td>
          <td class="text-xs">${escHtml(ev.environment || '—')}</td>
          <td><span class="badge badge-${ev.level || 'error'}">${escHtml(ev.level || 'error')}</span></td>
          <td class="text-xs" style="max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(ev.message)}">${escHtml(ev.message)}</td>
        </tr>
        ${meta ? `<tr><td colspan="4" class="py-2 px-3"><pre class="text-xs rounded p-2 overflow-x-auto" style="background:#F1F5F9;font-family:var(--font-mono)">${escHtml(JSON.stringify(meta, null, 2))}</pre></td></tr>` : ''}
      `;
    }).join('');
  }

  // ── Status update ─────────────────────────────────────────────────────────
  async function updateStatus(id, status) {
    await fetch(`/issues/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status }),
    });
    window.location.href = '/issues';
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  }

  function escHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  load();
})();
