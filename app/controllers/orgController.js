const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../db/database');
const emailService = require('../services/email');

const inviteMember = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const existing = db.prepare(
    'SELECT u.id FROM users u JOIN org_members m ON u.id = m.user_id WHERE u.email = ? AND m.org_id = ?'
  ).get(email.toLowerCase(), req.session.orgId);
  if (existing) return res.status(400).json({ error: 'This person is already a member.' });

  const pending = db.prepare(
    'SELECT id FROM invites WHERE email = ? AND org_id = ? AND accepted = 0'
  ).get(email.toLowerCase(), req.session.orgId);
  if (pending) return res.status(400).json({ error: 'An invite is already pending for this email.' });

  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO invites (org_id, email, token, invited_by) VALUES (?, ?, ?, ?)')
    .run(req.session.orgId, email.toLowerCase(), token, req.session.userId);

  try {
    await emailService.sendInvite(email, token);
  } catch (err) {
    console.error('Failed to send invite email:', err.message);
  }

  res.json({ success: true });
};

const showInvite = (req, res) => {
  const { token } = req.params;
  const invite = db.prepare('SELECT email FROM invites WHERE token = ? AND accepted = 0').get(token);
  if (!invite) {
    return res.render('auth/invite', { layout: 'auth', title: 'Invalid Invite', invalid: true });
  }
  res.render('auth/invite', { layout: 'auth', title: 'Accept Invitation', token, email: invite.email });
};

const acceptInvite = (req, res) => {
  const { token } = req.params;
  const { name, password } = req.body;

  const invite = db.prepare('SELECT * FROM invites WHERE token = ? AND accepted = 0').get(token);
  if (!invite) return res.status(400).json({ error: 'This invite link is invalid or has already been used.' });

  if (!name || !password) return res.status(400).json({ error: 'Name and password are required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(invite.email);
  if (existingUser) return res.status(400).json({ error: 'An account with this email already exists.' });

  const passwordHash = bcrypt.hashSync(password, 12);

  const process = db.transaction(() => {
    const user = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(invite.email, passwordHash, name.trim());
    db.prepare('INSERT INTO org_members (org_id, user_id, role) VALUES (?, ?, ?)').run(invite.org_id, user.lastInsertRowid, 'member');
    db.prepare('UPDATE invites SET accepted = 1 WHERE id = ?').run(invite.id);
    return user.lastInsertRowid;
  });

  const userId = process();
  req.session.userId = userId;
  req.session.orgId  = invite.org_id;

  res.json({ success: true, redirect: '/issues' });
};

module.exports = { inviteMember, showInvite, acceptInvite };
