(function () {
  const monitorList  = document.getElementById('monitor-list');
  const emptyState   = document.getElementById('empty-state');
  const loadingMsg   = document.getElementById('loading-msg');
  const monitorCount = document.getElementById('monitor-count');
  const addModal     = document.getElementById('add-modal');
  const addForm      = document.getElementById('add-monitor-form');
  const modalError   = document.getElementById('modal-error');

  // ── Fetch & render monitors ───────────────────────────────────────────────

  async function loadMonitors() {
    try {
      const res  = await fetch('/monitors/api');
      const data = await res.json();
      loadingMsg.remove();

      if (!data.monitors.length) {
        emptyState.classList.remove('hidden');
        monitorCount.textContent = '';
        return;
      }

      monitorCount.textContent = `${data.monitors.length} monitor${data.monitors.length !== 1 ? 's' : ''}`;
      await renderMonitors(data.monitors);
    } catch {
      loadingMsg.textContent = 'Failed to load monitors.';
    }
  }

  async function renderMonitors(monitors) {
    monitorList.innerHTML = '';

    await Promise.all(monitors.map(async (m) => {
      const pings = await fetchPings(m.id);
      const card  = buildCard(m, pings);
      monitorList.appendChild(card);
    }));
  }

  async function fetchPings(monitorId) {
    try {
      const res  = await fetch(`/monitors/${monitorId}/pings?limit=90`);
      const data = await res.json();
      return data.pings || [];
    } catch { return []; }
  }

  // ── Build monitor card ────────────────────────────────────────────────────

  function buildCard(monitor, pings) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded border flex items-center gap-4 px-5 py-4';
    card.style.borderColor = 'var(--color-border)';
    card.dataset.id = monitor.id;

    const { label, color } = statusLabel(monitor);
    const timeline = buildTimeline(pings);
    const upPct    = uptimePercent(pings);

    card.innerHTML = `
      <div style="min-width:220px">
        <div class="font-heading font-medium text-sm" style="color:var(--color-text)">${escHtml(monitor.name)}</div>
        <a href="${escHtml(monitor.url)}" target="_blank" rel="noopener noreferrer"
           class="text-xs hover:underline" style="color:var(--color-text-muted)"
           onclick="event.stopPropagation()">${escHtml(monitor.url)}</a>
      </div>

      <div class="flex-1">${timeline}</div>

      <div style="min-width:130px;text-align:right">
        <div class="text-sm font-medium" style="color:${color}">${label}</div>
        ${upPct !== null ? `<div class="text-xs mt-0.5" style="color:var(--color-text-muted)">${upPct}% uptime</div>` : ''}
      </div>

      <button class="btn btn-ghost text-xs delete-btn flex-shrink-0" data-id="${monitor.id}"
        onclick="deleteMonitor(event, ${monitor.id})">Delete</button>
    `;

    return card;
  }

  // ── Timeline bar ──────────────────────────────────────────────────────────

  function buildTimeline(pings) {
    if (!pings.length) {
      return `<div class="timeline-bar"><span class="text-xs" style="color:var(--color-text-muted)">No data yet</span></div>`;
    }

    const segments = pings.map(p =>
      `<div class="timeline-segment ${p.status}" title="${escHtml(p.timestamp)}: ${p.status}${p.response_time_ms ? ' ('+Math.round(p.response_time_ms)+'ms)' : ''}"></div>`
    ).join('');

    return `<div class="timeline-bar">${segments}</div>`;
  }

  // ── Status label ──────────────────────────────────────────────────────────

  function statusLabel(monitor) {
    if (!monitor.last_status) return { label: 'Pending', color: 'var(--color-text-muted)' };

    const since = monitor.status_changed_at || monitor.last_checked_at;
    const dur   = since ? humanDuration(Date.now() - new Date(since).getTime()) : '';

    if (monitor.last_status === 'up') {
      return { label: `Up${dur ? ' for ' + dur : ''}`, color: 'var(--color-up)' };
    }
    return { label: `Down${dur ? ' for ' + dur : ''}`, color: 'var(--color-down)' };
  }

  function uptimePercent(pings) {
    if (!pings.length) return null;
    const up = pings.filter(p => p.status === 'up').length;
    return ((up / pings.length) * 100).toFixed(1);
  }

  // ── Add monitor ───────────────────────────────────────────────────────────

  document.getElementById('add-monitor-btn').addEventListener('click', () => {
    addModal.classList.remove('hidden');
    modalError.classList.add('hidden');
    addForm.reset();
  });

  document.getElementById('modal-cancel').addEventListener('click', () => {
    addModal.classList.add('hidden');
  });

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalError.classList.add('hidden');

    const { name, url, webhook_url } = Object.fromEntries(new FormData(addForm));
    const body = { name, url };
    if (webhook_url) body.webhook_url = webhook_url;

    const res  = await fetch('/monitors', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    const json = await res.json();

    if (!res.ok) {
      modalError.textContent = json.error || 'Failed to create monitor.';
      modalError.classList.remove('hidden');
      return;
    }

    addModal.classList.add('hidden');
    // Append new card (no pings yet)
    const card = buildCard(json.monitor, []);
    if (emptyState.classList.contains('hidden') === false) {
      emptyState.classList.add('hidden');
    }
    monitorList.appendChild(card);

    const current = parseInt(monitorCount.textContent) || 0;
    monitorCount.textContent = `${current + 1} monitor${current + 1 !== 1 ? 's' : ''}`;
  });

  // ── Delete monitor ────────────────────────────────────────────────────────

  window.deleteMonitor = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this monitor? All ping history will be permanently removed.')) return;

    const res = await fetch(`/monitors/${id}`, { method: 'DELETE' });
    if (!res.ok) return;

    const card = monitorList.querySelector(`[data-id="${id}"]`);
    if (card) card.remove();

    const remaining = monitorList.children.length;
    monitorCount.textContent = remaining
      ? `${remaining} monitor${remaining !== 1 ? 's' : ''}`
      : '';

    if (!remaining) emptyState.classList.remove('hidden');
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  function humanDuration(ms) {
    const secs  = Math.floor(ms / 1000);
    const mins  = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    if (days  > 0)  return `${days}d`;
    if (hours > 0)  return `${hours}h`;
    if (mins  > 0)  return `${mins}m`;
    return `${secs}s`;
  }

  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  loadMonitors();
})();
