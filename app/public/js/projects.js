(function () {
  const form = document.getElementById('new-project-form');
  const modal = document.getElementById('new-project-modal');
  const errEl = document.getElementById('modal-error');

  function showError(msg) {
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.classList.add('hidden');

      const { name } = Object.fromEntries(new FormData(form));

      const res  = await fetch('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();

      if (!res.ok) return showError(json.error || 'Failed to create project.');

      modal.classList.add('hidden');
      form.reset();
      appendProjectRow(json.project);
    });
  }

  function appendProjectRow(project) {
    const tbody = document.getElementById('projects-tbody');
    if (!tbody) return window.location.reload();

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-medium" style="font-family:var(--font-primary)">${escHtml(project.name)}</td>
      <td><code class="text-xs px-2 py-1 rounded" style="background:var(--color-bg);font-family:var(--font-mono)">${escHtml(project.api_key)}</code></td>
      <td style="color:var(--color-text-muted)">${escHtml(project.created_at)}</td>
      <td class="text-right"><button class="btn btn-ghost text-xs" onclick="deleteProject(${project.id}, this)">Delete</button></td>
    `;
    tbody.prepend(tr);
  }

  window.deleteProject = async (id, btn) => {
    if (!confirm('Delete this project? All associated data will be permanently removed.')) return;
    const res = await fetch(`/projects/${id}`, { method: 'DELETE' });
    if (res.ok) btn.closest('tr').remove();
  };

  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
