(function () {
  // ── State ────────────────────────────────────────────────────────────────
  let state = {
    status:      'unresolved',
    environment: '',
    timeRange:   '',
    sort:        'last_seen',
    search:      '',
    page:        1,
    limit:       25,
    total:       0,
  };
  let debounceTimer = null;

  // ── DOM refs ─────────────────────────────────────────────────────────────
  const tbody        = document.getElementById('issues-tbody');
  const selectAll    = document.getElementById('select-all');
  const bulkToolbar  = document.getElementById('bulk-toolbar');
  const selectedCount= document.getElementById('selected-count');
  const pageInfo     = document.getElementById('page-info');
  const prevBtn      = document.getElementById('prev-btn');
  const nextBtn      = document.getElementById('next-btn');

  // ── Fetch & render ───────────────────────────────────────────────────────
  async function loadIssues() {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-10" style="color:var(--color-text-muted)">Loading…</td></tr>';
    selectAll.checked = false;
    hideBulkToolbar();

    const params = new URLSearchParams({
      status:      state.status,
      sort:        state.sort,
      page:        state.page,
      limit:       state.limit,
      ...(state.environment && { environment: state.environment }),
      ...(state.timeRange    && { timeRange:   state.timeRange }),
      ...(state.search       && { search:      state.search }),
    });

    try {
      const res  = await fetch(`/issues/api?${params}`);
      const data = await res.json();
      state.total = data.total;
      renderRows(data.issues);
      renderPagination();
    } catch {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-10" style="color:#EF4444">Failed to load issues.</td></tr>';
    }
  }

  function renderRows(issues) {
    if (!issues.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-10" style="color:var(--color-text-muted)">No ${state.status} issues found.</td></tr>`;
      return;
    }

    tbody.innerHTML = issues.map(issue => {
      const age   = relativeTime(issue.first_seen);
      const last  = relativeTime(issue.last_seen);
      const badge = `<span class="badge badge-${issue.status}">${issue.status}</span>`;
      const spark = buildSparkline(issue.trend);

      return `
        <tr data-id="${issue.id}" class="issue-row" onclick="navigateToIssue(event, ${issue.id})">
          <td onclick="event.stopPropagation()">
            <input type="checkbox" class="row-check" data-id="${issue.id}" />
          </td>
          <td>
            <div class="flex items-center gap-2 mb-0.5">
              ${badge}
              <span class="text-xs" style="color:var(--color-text-muted)">${escHtml(issue.project_name)}</span>
            </div>
            <div class="font-medium text-sm leading-snug" style="color:var(--color-text)">${escHtml(issue.title)}</div>
            <div class="text-xs mt-0.5" style="color:var(--color-text-muted)">First seen ${age} · Last seen ${last}</div>
          </td>
          <td>${spark}</td>
          <td class="text-right font-medium text-sm">${issue.event_count.toLocaleString()}</td>
        </tr>`;
    }).join('');

    // Wire up checkbox change listeners
    tbody.querySelectorAll('.row-check').forEach(cb => {
      cb.addEventListener('change', updateBulkToolbar);
    });
  }

  // ── Sparkline (SVG) ──────────────────────────────────────────────────────
  function buildSparkline(trend) {
    const W = 140, H = 24, BARS = 14;
    const barW  = Math.floor(W / BARS) - 1;
    const today = new Date();

    // Build a day-keyed map
    const byDay = {};
    (trend || []).forEach(t => { byDay[t.day] = t.count; });

    // Build 14-day array ending today
    const days = [];
    for (let i = BARS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push(byDay[key] || 0);
    }

    const max = Math.max(...days, 1);
    const bars = days.map((count, i) => {
      const barH  = Math.max(2, Math.round((count / max) * H));
      const x     = i * (barW + 1);
      const y     = H - barH;
      const color = count > 0 ? '#C1121F' : '#E5E7EB';
      return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${color}" rx="1"/>`;
    }).join('');

    return `<svg width="${W}" height="${H}" class="sparkline">${bars}</svg>`;
  }

  // ── Pagination ───────────────────────────────────────────────────────────
  function renderPagination() {
    const totalPages = Math.ceil(state.total / state.limit);
    const start = (state.page - 1) * state.limit + 1;
    const end   = Math.min(state.page * state.limit, state.total);

    pageInfo.textContent = state.total
      ? `Showing ${start}–${end} of ${state.total.toLocaleString()} issues`
      : '';

    prevBtn.disabled = state.page <= 1;
    nextBtn.disabled = state.page >= totalPages;
  }

  // ── Bulk actions ─────────────────────────────────────────────────────────
  function getCheckedIds() {
    return Array.from(tbody.querySelectorAll('.row-check:checked')).map(cb => Number(cb.dataset.id));
  }

  function updateBulkToolbar() {
    const ids = getCheckedIds();
    if (ids.length) {
      bulkToolbar.classList.remove('hidden');
      selectedCount.textContent = `${ids.length} selected`;
    } else {
      hideBulkToolbar();
    }
    selectAll.checked = ids.length > 0 && ids.length === tbody.querySelectorAll('.row-check').length;
  }

  function hideBulkToolbar() {
    bulkToolbar.classList.add('hidden');
    selectedCount.textContent = '';
  }

  async function bulkAction(action) {
    const ids = getCheckedIds();
    if (!ids.length) return;

    const res  = await fetch('/issues/bulk', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ids, action }),
    });
    if (res.ok) loadIssues();
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  window.navigateToIssue = (e, id) => {
    if (e.target.type === 'checkbox') return;
    window.location.href = `/issues/${id}`;
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function relativeTime(iso) {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30)  return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  }

  function escHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Event listeners ──────────────────────────────────────────────────────
  document.getElementById('search-input').addEventListener('input', e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadIssues();
    }, 350);
  });

  document.getElementById('env-filter').addEventListener('change',  e => { state.environment = e.target.value; state.page = 1; loadIssues(); });
  document.getElementById('time-filter').addEventListener('change', e => { state.timeRange    = e.target.value; state.page = 1; loadIssues(); });
  document.getElementById('sort-filter').addEventListener('change', e => { state.sort         = e.target.value; state.page = 1; loadIssues(); });

  document.querySelectorAll('.status-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.status-tab').forEach(b => b.classList.remove('active-tab'));
      btn.classList.add('active-tab');
      state.status = btn.dataset.status;
      state.page   = 1;
      loadIssues();
    });
  });

  selectAll.addEventListener('change', () => {
    tbody.querySelectorAll('.row-check').forEach(cb => { cb.checked = selectAll.checked; });
    updateBulkToolbar();
  });

  document.getElementById('bulk-resolve').addEventListener('click',   () => bulkAction('resolve'));
  document.getElementById('bulk-unresolve').addEventListener('click', () => bulkAction('unresolve'));
  document.getElementById('bulk-ignore').addEventListener('click',    () => bulkAction('ignore'));
  document.getElementById('bulk-merge').addEventListener('click',     () => bulkAction('merge'));

  prevBtn.addEventListener('click', () => { state.page--; loadIssues(); });
  nextBtn.addEventListener('click', () => { state.page++; loadIssues(); });

  // Highlight active status tab
  const style = document.createElement('style');
  style.textContent = `.status-tab.active-tab { background: var(--color-brand); color: #fff; border-color: var(--color-brand); }`;
  document.head.appendChild(style);

  // ── Init ─────────────────────────────────────────────────────────────────
  loadIssues();
})();
