const express = require('express');
const session = require('express-session');
const path = require('path');
const { engine } = require('express-handlebars');
const db = require('./db/database');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.engine('html', engine({
  extname: '.html',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  defaultLayout: 'main',
}));
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'glitchradar-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// Public routes
app.use('/auth', require('./routes/auth'));
app.use('/invite', require('./routes/invite'));

// Protected routes
app.use('/issues',       requireAuth, require('./routes/errors'));
app.use('/logs',         requireAuth, require('./routes/logs'));
app.use('/transactions', requireAuth, require('./routes/transactions'));
app.use('/monitors',     requireAuth, require('./routes/monitors'));
app.use('/projects',     requireAuth, require('./routes/projects'));
app.use('/org',          requireAuth, require('./routes/organizations'));

// Ingest endpoints (API key auth handled per-router)
app.use('/api/v1/errors',       require('./routes/ingest/errors'));
app.use('/api/v1/logs',         require('./routes/ingest/logs'));
app.use('/api/v1/transactions', require('./routes/ingest/transactions'));

app.get('/', (req, res) => {
  if (!req.session.userId) return res.redirect('/auth/login');
  res.redirect('/issues');
});

app.listen(PORT, () => {
  console.log(`GlitchRadar running at http://localhost:${PORT}`);
});
