const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'glitchradar-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/org', require('./routes/organizations'));
app.use('/projects', require('./routes/projects'));
app.use('/issues', require('./routes/errors'));
app.use('/logs', require('./routes/logs'));
app.use('/transactions', require('./routes/transactions'));
app.use('/monitors', require('./routes/monitors'));
app.use('/api/v1/errors', require('./routes/ingest/errors'));
app.use('/api/v1/logs', require('./routes/ingest/logs'));
app.use('/api/v1/transactions', require('./routes/ingest/transactions'));

app.get('/', (req, res) => {
  if (!req.session.userId) return res.redirect('/auth/login');
  res.redirect('/issues');
});

app.listen(PORT, () => {
  console.log(`GlitchRadar running at http://localhost:${PORT}`);
});
