(function () {
  // ── State ────────────────────────────────────────────────────────────────
  let state = { environment: '', sort: 'slowest' };

  // ── DOM refs ─────────────────────────────────────────────────────────────
  const tbody = document.getElementById('groups-tbody');

  // ── Fetch & render ───────────────────────────────────────────────────────
  async function loadGroups() {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-10" style="color:var(--color-text-muted)">Loading…</td></tr>';

    const params = new URLSearchParams({ sort: state.sort });
    if (state.environment) params.set('environment', state.environment);

    try {
      const res  = await fetch(`/transactions/groups?${params}`);
      const data = await res.json();
      renderRows(data.groups);
    } catch {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-10" style="color:#EF4444">Failed to load transactions.</td></tr>';
    }
  }

  function renderRows(groups) {
    if (!groups.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-10" style="color:var(--color-text-muted)">No transactions recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = groups.map(g => {
      const avg  = formatDuration(g.avg_duration);
      const name = escHtml(g.name);
      return `
        <tr class="cursor-pointer hover:bg-gray-50" onclick="navigateToDetail(${JSON.stringify(g.name)})">
          <td>
            <div class="font-medium text-sm" style="color:var(--color-text)">${name}</div>
            <div class="text-xs mt-0.5" style="color:var(--color-text-muted)">${escHtml(g.project_name)}</div>
          </td>
          <td style="color:var(--color-text-muted)">${escHtml(g.project_name)}</td>
          <td class="text-right text-sm">${Number(g.transaction_count).toLocaleString()}</td>
          <td class="text-right">
            <span class="font-medium text-sm" style="color:${durationColor(g.avg_duration)}">${avg}</span>
          </td>
        </tr>`;
    }).join('');
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  window.navigateToDetail = (name) => {
    window.location.href = `/transactions/detail?name=${encodeURIComponent(name)}`;
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatDuration(ms) {
    if (ms === null || ms === undefined) return '—';
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.round(ms)}ms`;
  }

  function durationColor(ms) {
    if (ms >= 1000)  return '#EF4444'; // red — very slow
    if (ms >= 500)   return '#F97316'; // orange — slow
    if (ms >= 200)   return '#EAB308'; // yellow — moderate
    return 'var(--color-text)';        // normal
  }

  function escHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Event listeners ───────────────────────────────────────────────────────
  document.getElementById('env-filter').addEventListener('change', e => {
    state.environment = e.target.value;
    loadGroups();
  });

  document.getElementById('sort-filter').addEventListener('change', e => {
    state.sort = e.target.value;
    loadGroups();
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  loadGroups();
})();
