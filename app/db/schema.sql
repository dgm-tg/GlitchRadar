-- =============================================================
-- GlitchRadar Database Schema
-- =============================================================

-- -------------------------------------------------------------
-- 2.0 Authentication & Multi-Tenancy
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS org_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin' | 'member'
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_id, user_id)
);

CREATE TABLE IF NOT EXISTS invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by INTEGER NOT NULL REFERENCES users(id),
  accepted INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- 3.0 Error Tracking
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unresolved', -- 'unresolved' | 'resolved' | 'ignored'
  level TEXT NOT NULL DEFAULT 'error',
  environment TEXT,
  event_count INTEGER NOT NULL DEFAULT 1,
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id, status, last_seen);

CREATE TABLE IF NOT EXISTS error_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  stack_trace TEXT,
  environment TEXT,
  level TEXT,
  metadata TEXT, -- JSON blob
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_events_issue ON error_events(issue_id, timestamp);

-- -------------------------------------------------------------
-- 4.0 Logs
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  level TEXT NOT NULL, -- 'FATAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'
  message TEXT NOT NULL,
  service TEXT,
  metadata TEXT, -- JSON blob
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_project ON logs(project_id, timestamp, level);

-- -------------------------------------------------------------
-- 5.0 Performance Monitoring
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  http_method TEXT,
  duration_ms REAL NOT NULL,
  status_code INTEGER,
  environment TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_project ON transactions(project_id, name);

-- -------------------------------------------------------------
-- 6.0 Uptime Monitoring
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS monitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  interval_seconds INTEGER NOT NULL DEFAULT 60,
  webhook_url TEXT,
  last_status TEXT, -- 'up' | 'down' | NULL (never checked)
  last_checked_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ping_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- 'up' | 'down'
  response_time_ms REAL,
  http_status_code INTEGER,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ping_results_monitor ON ping_results(monitor_id, timestamp);
