const bcrypt = require('bcrypt');
const db = require('../db/database');

const SALT_ROUNDS = 12;

const showLogin = (req, res) => {
  if (req.session.userId) return res.redirect('/issues');
  res.render('auth/login', { layout: 'auth', title: 'Sign in' });
};

const showSignup = (req, res) => {
  if (req.session.userId) return res.redirect('/issues');
  res.render('auth/signup', { layout: 'auth', title: 'Create account' });
};

const signup = (req, res) => {
  const { name, email, password, orgName } = req.body;

  if (!name || !email || !password || !orgName) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'An account with that email already exists.' });
  }

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);

  const create = db.transaction(() => {
    const org  = db.prepare('INSERT INTO organizations (name) VALUES (?)').run(orgName.trim());
    const user = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(email.toLowerCase(), passwordHash, name.trim());
    db.prepare('INSERT INTO org_members (org_id, user_id, role) VALUES (?, ?, ?)').run(org.lastInsertRowid, user.lastInsertRowid, 'admin');
    return { orgId: org.lastInsertRowid, userId: user.lastInsertRowid };
  });

  const { orgId, userId } = create();
  req.session.userId = userId;
  req.session.orgId  = orgId;

  res.json({ success: true, redirect: '/issues' });
};

const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const membership = db.prepare('SELECT org_id FROM org_members WHERE user_id = ? LIMIT 1').get(user.id);
  if (!membership) {
    return res.status(401).json({ error: 'No organization found for this account.' });
  }

  req.session.userId = user.id;
  req.session.orgId  = membership.org_id;

  res.json({ success: true, redirect: '/issues' });
};

const logout = (req, res) => {
  req.session.destroy(() => res.redirect('/auth/login'));
};

module.exports = { showLogin, showSignup, signup, login, logout };
