const db = require('../db/database');

const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'Missing X-API-Key header' });

  const project = db.prepare('SELECT id, org_id FROM projects WHERE api_key = ?').get(apiKey);
  if (!project) return res.status(401).json({ error: 'Invalid API key' });

  req.projectId = project.id;
  req.orgId = project.org_id;
  next();
};

module.exports = { requireApiKey };
