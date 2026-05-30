const db = require('../db/database');

const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.redirect('/auth/login');
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.redirect('/auth/login');
  }
  req.user = user;
  next();
};

module.exports = { requireAuth };
