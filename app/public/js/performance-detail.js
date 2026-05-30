(function () {
  // ── Read group name from URL ───────────────────────────────────────────────
  const groupName = new URLSearchParams(window.location.search).get('name');

  if (!groupName) {
    document.getElementById('perf-detail').innerHTML =
      '<p style="color:var(--color-text-muted)">No transaction name specified.</p>';
    return;
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let state = { page: 1, limit: 50, total: 0 };

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const tbody    = document.getElementById('samples-tbody');
  const pageInfo = document.getElementById('page-info');
  const prevBtn  = document.getElementById('prev-btn');
  const nextBtn  = document.getElementById('next-btn');

  // ── Load group summary from /transactions/groups ───────────────────────────
  async function loadSummary() {
    try {
      const res  = await fetch(`/transactions/groups?name=${encodeURIComponent(groupName)}`);
      const data = await res.json();
      const g    = data.groups.find(r => r.name === groupName);
      if (!g) return;

      document.getElementById('detail-name').textContent = g.name;
      document.getElementById('detail-meta').textContent =
        `${g.project_name} · ${g.transaction_count.toLocaleString()} transactions`;
      document.getElementById('stat-avg').textContent   = formatDuration(g.avg_duration);
      document.getElementById('stat-max').textContent   = formatDuration(g.max_duration);
      document.getElementById('stat-min').textContent   = formatDuration(g.min_duration);
      document.getElementById('stat-total').textContent = g.transaction_count.toLocaleString();
    } catch { /* non-critical */ }
  }

  // ── Load samples ──────────────────────────────────────────────────────────
  async function loadSamples() {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10" style="color:var(--color-text-muted)">Loading…</td></tr>';

    const params = new URLSearchParams({
      name:  groupName,
      page:  state.page,
      limit: state.limit,
    });

    try {
      const res  = await fetch(`/transactions/api?${params}`);
      const data = await res.json();
      state.total = data.total;
      renderRows(data.transactions);
      renderPagination();
    } catch {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10" style="color:#EF4444">Failed to load samples.</td></tr>';
    }
  }

  function renderRows(txns) {
    if (!txns.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10" style="color:var(--color-text-muted)">No samples found.</td></tr>';
      return;
    }

    tbody.innerHTML = txns.map(t => {
      const statusClass = t.status_code
        ? (t.status_code >= 500 ? 'badge-fatal' : t.status_code >= 400 ? 'badge-warn' : 'badge-resolved')
        : '';
      return `
        <tr>
          <td class="text-xs" style="color:var(--color-text-muted);white-space:nowrap">${escHtml(formatDate(t.timestamp))}</td>
          <td>
            ${t.http_method
              ? `<span class="badge" style="background:var(--color-bg);color:var(--color-text-muted)">${escHtml(t.http_method)}</span>`
              : '<span style="color:var(--color-text-muted)">—</span>'}
          </td>
          <td class="text-right">
            <span class="font-medium text-sm" style="color:${durationColor(t.duration_ms)}">${formatDuration(t.duration_ms)}</span>
          </td>
          <td class="text-center">
            ${t.status_code
              ? `<span class="badge ${statusClass}">${t.status_code}</span>`
              : '<span style="color:var(--color-text-muted)">—</span>'}
          </td>
          <td class="text-xs" style="color:var(--color-text-muted)">${escHtml(t.environment || '—')}</td>
        </tr>`;
    }).join('');
  }

  function renderPagination() {
    const totalPages = Math.ceil(state.total / state.limit);
    const start = (state.page - 1) * state.limit + 1;
    const end   = Math.min(state.page * state.limit, state.total);
    pageInfo.textContent = state.total ? `Showing ${start}–${end} of ${state.total.toLocaleString()}` : '';
    prevBtn.disabled = state.page <= 1;
    nextBtn.disabled = state.page >= totalPages;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatDuration(ms) {
    if (ms === null || ms === undefined) return '—';
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.round(ms)}ms`;
  }

  function durationColor(ms) {
    if (ms >= 1000)  return '#EF4444';
    if (ms >= 500)   return '#F97316';
    if (ms >= 200)   return '#EAB308';
    return 'var(--color-text)';
  }

  function formatDate(iso) {
    return iso ? new Date(iso).toLocaleString() : '—';
  }

  function escHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Event listeners ───────────────────────────────────────────────────────
  prevBtn.addEventListener('click', () => { state.page--; loadSamples(); });
  nextBtn.addEventListener('click', () => { state.page++; loadSamples(); });

  // ── Init ──────────────────────────────────────────────────────────────────
  loadSummary();
  loadSamples();
})();
