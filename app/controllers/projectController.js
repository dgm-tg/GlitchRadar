const crypto = require('crypto');
const db = require('../db/database');

const listProjects = (req, res) => {
  const projects = db.prepare(
    'SELECT * FROM projects WHERE org_id = ? ORDER BY created_at DESC'
  ).all(req.session.orgId);
  res.render('projects/index', { title: 'Projects', projects, isSettings: true });
};

const createProject = (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required.' });

  const apiKey = crypto.randomUUID();
  const result = db.prepare('INSERT INTO projects (org_id, name, api_key) VALUES (?, ?, ?)')
    .run(req.session.orgId, name.trim(), apiKey);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ project });
};

const deleteProject = (req, res) => {
  const { id } = req.params;
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND org_id = ?').get(id, req.session.orgId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  res.json({ success: true });
};

module.exports = { listProjects, createProject, deleteProject };
