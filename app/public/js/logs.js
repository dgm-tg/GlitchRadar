(function () {
  // ── State ────────────────────────────────────────────────────────────────
  let state = {
    level:     '',
    service:   '',
    timeRange: '',
    search:    '',
    cursor:    null,
    totalShown: 0,
  };
  let debounceTimer = null;
  let isLoading = false;

  // ── DOM refs ─────────────────────────────────────────────────────────────
  const feed        = document.getElementById('log-feed');
  const emptyMsg    = document.getElementById('log-empty');
  const loadingMsg  = document.getElementById('log-loading');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const noMoreMsg   = document.getElementById('no-more-msg');
  const logCount    = document.getElementById('log-count');

  // ── Level styling ─────────────────────────────────────────────────────────
  const LEVEL_COLOR = {
    FATAL: 'var(--color-log-fatal)',
    ERROR: 'var(--color-log-error)',
    WARN:  'var(--color-log-warn)',
    INFO:  'var(--color-log-info)',
    DEBUG: 'var(--color-log-debug)',
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function loadLogs(append = false) {
    if (isLoading) return;
    isLoading = true;

    if (!append) {
      feed.innerHTML = '';
      state.cursor    = null;
      state.totalShown = 0;
      loadMoreBtn.classList.add('hidden');
      noMoreMsg.classList.add('hidden');
      emptyMsg.classList.add('hidden');
      loadingMsg.classList.remove('hidden');
    } else {
      loadMoreBtn.classList.add('hidden');
      loadMoreBtn.textContent = 'Loading…';
    }

    const params = new URLSearchParams({ limit: 50 });
    if (state.cursor)    params.set('cursor',    state.cursor);
    if (state.level)     params.set('level',     state.level);
    if (state.service)   params.set('service',   state.service);
    if (state.timeRange) params.set('timeRange', state.timeRange);
    if (state.search)    params.set('search',    state.search);

    try {
      const res  = await fetch(`/logs/api?${params}`);
      const data = await res.json();

      loadingMsg.classList.add('hidden');

      if (!data.logs.length && !append) {
        emptyMsg.classList.remove('hidden');
        logCount.textContent = '';
      } else {
        renderRows(data.logs);
        state.totalShown += data.logs.length;
        logCount.textContent = `${state.totalShown.toLocaleString()} entries`;
      }

      if (data.nextCursor) {
        state.cursor = data.nextCursor;
        loadMoreBtn.textContent = '↓ Load more';
        loadMoreBtn.classList.remove('hidden');
        noMoreMsg.classList.add('hidden');
      } else {
        loadMoreBtn.classList.add('hidden');
        if (state.totalShown > 0) noMoreMsg.classList.remove('hidden');
      }
    } catch {
      loadingMsg.classList.add('hidden');
      feed.insertAdjacentHTML('beforeend',
        '<div class="py-4 text-center text-sm" style="color:#EF4444">Failed to load logs.</div>');
    }

    isLoading = false;
  }

  // ── Render rows ───────────────────────────────────────────────────────────
  function renderRows(logs) {
    const fragment = document.createDocumentFragment();
    logs.forEach(log => {
      const row = document.createElement('div');
      row.className = 'log-row';

      const ts    = formatTimestamp(log.timestamp);
      const color = LEVEL_COLOR[log.level] || LEVEL_COLOR.DEBUG;

      row.innerHTML = `
        <span class="log-timestamp">${escHtml(ts)}</span>
        <span class="log-level log-level-${log.level}" style="color:${color}">${log.level}</span>
        <span class="log-message">${escHtml(log.message)}</span>
      `;
      fragment.appendChild(row);
    });
    feed.appendChild(fragment);
  }

  // ── Services dropdown ─────────────────────────────────────────────────────
  async function loadServices() {
    try {
      const res  = await fetch('/logs/services');
      const data = await res.json();
      const sel  = document.getElementById('service-filter');
      data.services.forEach(s => {
        const opt = document.createElement('option');
        opt.value       = s;
        opt.textContent = s;
        sel.appendChild(opt);
      });
    } catch { /* non-critical */ }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatTimestamp(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ` +
           `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.` +
           `${String(d.getMilliseconds()).padStart(3, '0')}`;
  }

  function escHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Event listeners ───────────────────────────────────────────────────────
  document.getElementById('search-input').addEventListener('input', e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.search = e.target.value.trim();
      loadLogs(false);
    }, 350);
  });

  document.getElementById('level-filter').addEventListener('change', e => {
    state.level = e.target.value;
    loadLogs(false);
  });

  document.getElementById('service-filter').addEventListener('change', e => {
    state.service = e.target.value;
    loadLogs(false);
  });

  document.getElementById('time-filter').addEventListener('change', e => {
    state.timeRange = e.target.value;
    loadLogs(false);
  });

  loadMoreBtn.addEventListener('click', () => loadLogs(true));

  // ── Init ──────────────────────────────────────────────────────────────────
  loadServices();
  loadLogs(false);
})();
