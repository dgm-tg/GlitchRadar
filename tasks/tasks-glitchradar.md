## Relevant Files

### Backend
- `server.js` - Express app entry point, mounts all routes and middleware
- `package.json` - Project dependencies and scripts
- `tailwind.config.js` - Tailwind CSS configuration
- `db/database.js` - SQLite connection setup with WAL mode enabled
- `db/schema.sql` - Full database schema (all tables and indexes)
- `middleware/auth.js` - Session-based auth middleware for protecting UI routes
- `middleware/apiKey.js` - API key validation middleware for ingest endpoints
- `routes/auth.js` - Signup, login, and invite routes
- `routes/organizations.js` - Org management and member invite routes
- `routes/projects.js` - Project CRUD routes
- `routes/errors.js` - Error ingest (`POST /api/v1/errors`) and issues routes
- `routes/logs.js` - Log ingest (`POST /api/v1/logs`) and query routes
- `routes/transactions.js` - Transaction ingest (`POST /api/v1/transactions`) and query routes
- `routes/monitors.js` - Uptime monitor CRUD routes
- `controllers/authController.js` - Auth business logic
- `controllers/orgController.js` - Org and member management logic
- `controllers/projectController.js` - Project and API key logic
- `controllers/errorController.js` - Issue grouping, fingerprinting, status updates
- `controllers/logController.js` - Log ingestion and query logic
- `controllers/transactionController.js` - Transaction ingestion and grouping logic
- `controllers/monitorController.js` - Monitor CRUD and ping result logic
- `services/fingerprint.js` - Error fingerprinting (hash of message + stack frames)
- `services/scheduler.js` - Uptime ping scheduler (background job, runs on interval)
- `services/email.js` - Transactional email alert delivery
- `services/webhook.js` - Webhook delivery with retry/backoff logic

### Frontend
- `public/css/main.css` - Global styles: base resets, CSS custom properties (`--font-primary`, `--font-mono`, design tokens)
- `public/css/output.css` - Tailwind compiled output (generated, do not edit manually)
- `public/js/auth.js` - Vanilla JS for signup/login form handling
- `public/js/issues.js` - Vanilla JS for issues list: fetch, render table, sparklines, bulk actions, filters
- `public/js/issue-detail.js` - Vanilla JS for issue detail: fetch event history, render stack trace
- `public/js/logs.js` - Vanilla JS for log feed: fetch, render terminal view, filter, load-more pagination
- `public/js/performance.js` - Vanilla JS for performance list: fetch groups, render table, sort/filter
- `public/js/performance-detail.js` - Vanilla JS for transaction group detail: individual samples
- `public/js/uptime.js` - Vanilla JS for uptime page: fetch monitors, render list and timeline bars, add monitor form

### Views (HTML templates)
- `views/layout.html` - Base HTML shell with sidebar nav, Google Fonts link, Tailwind + main.css
- `views/auth/login.html` - Login page
- `views/auth/signup.html` - Signup page
- `views/auth/invite.html` - Invite acceptance page
- `views/issues/list.html` - Issues list page (Error Tracking)
- `views/issues/detail.html` - Issue detail page (stack trace, event history)
- `views/logs/index.html` - Logs terminal feed page
- `views/performance/list.html` - Transaction groups list page
- `views/performance/detail.html` - Transaction group detail page
- `views/uptime/index.html` - Uptime monitors list page

### Notes

- No test framework is configured in v1 — tests are out of scope per the PRD.
- Run the dev server with `npm run dev` (nodemon watching `server.js`).
- Compile Tailwind in watch mode with `npm run css:watch`.
- SQLite database file will be created at `db/glitchradar.db` on first run.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Create and checkout a new branch: `git checkout -b feature/glitchradar`

- [x] 1.0 Project Setup & Infrastructure
  - [x] 1.1 Run `npm init -y` and install core dependencies: `express`, `better-sqlite3`, `express-session`, `bcrypt`, `nodemailer`, `node-cron`
  - [x] 1.2 Install dev dependencies: `nodemon`, `tailwindcss`, `@tailwindcss/cli`
  - [x] 1.3 Create `server.js` — initialize Express app, register middleware (JSON body parser, session, static files), mount all route files, and start the server
  - [x] 1.4 Create the full folder structure: `db/`, `middleware/`, `routes/`, `controllers/`, `services/`, `public/css/`, `public/js/`, `views/auth/`, `views/issues/`, `views/logs/`, `views/performance/`, `views/uptime/`
  - [x] 1.5 Create `db/schema.sql` with placeholder comments for each module's tables (to be filled in per feature)
  - [x] 1.6 Create `db/database.js` — open SQLite connection, enable WAL mode (`PRAGMA journal_mode=WAL`), run schema on startup
  - [x] 1.7 Initialize Tailwind CSS: theme configured via `@theme` in `main.css` (Tailwind v4 approach); `@tailwindcss/cli` installed for the build step
  - [x] 1.8 Create `public/css/main.css` with: base reset, CSS custom properties (`--font-primary: 'Zalando Sans'`, `--font-mono: 'JetBrains Mono'`, color tokens), and utility classes for the terminal log viewer and sparkline containers
  - [x] 1.9 Create `views/layout.html` — base HTML shell with `<link>` for Google Fonts (Zalando Sans + JetBrains Mono), Tailwind `output.css`, `main.css`, left sidebar nav with icons for each module (Error Tracking, Logs, Performance, Uptime), and top-right project/org switcher placeholder
  - [x] 1.10 Add npm scripts to `package.json`: `"dev": "nodemon server.js"`, `"css:watch"`, `"css:build"` using `@tailwindcss/cli`

- [x] 2.0 Authentication & Multi-Tenancy
  - [x] 2.1 Add schema to `db/schema.sql` for tables: `users`, `organizations`, `org_members`, `projects`, `invites`
  - [x] 2.2 Build `POST /auth/signup` — create user (hashed password via bcrypt) and their organization in a single SQLite transaction; return session
  - [x] 2.3 Build `POST /auth/login` — validate credentials, create session with `userId` and `orgId`
  - [x] 2.4 Build `GET /auth/logout` — destroy session and redirect to login
  - [x] 2.5 Create `middleware/auth.js` — check for valid session; redirect unauthenticated requests to `/auth/login`
  - [x] 2.6 Create `middleware/apiKey.js` — read `X-API-Key` header, look up matching project, attach `projectId` and `orgId` to `req`; return 401 if invalid
  - [x] 2.7 Build `POST /org/invite` — generate a secure random invite token, store in `invites` table, send invite email via `services/email.js`
  - [x] 2.8 Build `GET /invite/:token` — render invite acceptance page; `POST /invite/:token` — create user + `org_member` record, expire the token
  - [x] 2.9 Build `POST /projects` — create a project for the current org, generate a UUID API key, store in `projects` table
  - [x] 2.10 Build `GET /projects` — list all projects for the current org
  - [x] 2.11 Create `views/auth/login.html`, `views/auth/signup.html`, `views/auth/invite.html` pages matching the GlitchRadar design (Zalando Sans headings, form inputs styled with Tailwind)
  - [x] 2.12 Create `public/js/auth.js` — handle signup and login form submission via `fetch`, display inline validation errors, redirect on success

- [x] 3.0 Error Tracking
  - [x] 3.1 Add schema to `db/schema.sql` for tables: `issues` (fingerprint, title, status, first_seen, last_seen, event_count) and `error_events` (issue_id, message, stack_trace, environment, level, metadata, timestamp)
  - [x] 3.2 Create `services/fingerprint.js` — normalize error message and extract top 5 stack frames, return a SHA-256 hash as the fingerprint
  - [x] 3.3 Build `POST /api/v1/errors` (API key protected) — validate payload, compute fingerprint, find or create issue, insert error event, increment event count and update `last_seen`
  - [x] 3.4 Build `GET /issues` — paginated issues list filterable by `status`, `environment`, `timeRange`; sortable by `last_seen`, `first_seen`, `event_count`; supports keyword search on title
  - [x] 3.5 Build `PATCH /issues/:id` — update a single issue's status (`resolved`, `unresolved`, `ignored`)
  - [x] 3.6 Build `POST /issues/bulk` — accept an array of issue IDs and an action (`resolve`, `unresolve`, `ignore`, `merge`); apply to all in a single transaction
  - [x] 3.7 Build `GET /issues/:id` — return issue detail including all associated `error_events`
  - [x] 3.8 Create `views/issues/list.html` — issues table with checkboxes, trend column (sparkline placeholder), event count, last seen, bulk action toolbar (Mark Resolved / Unresolved / Ignored / Merge); search input and filter dropdowns (Environment, Time Range, Sort By)
  - [x] 3.9 Create `views/issues/detail.html` — issue header, status badge, event count, stack trace block (JetBrains Mono), event history list, metadata display
  - [x] 3.10 Create `public/js/issues.js` — on page load fetch issues from `GET /issues` with current filters; render rows into the table; wire up search, filter dropdowns, and sort controls to re-fetch
  - [x] 3.11 Add sparkline rendering in `public/js/issues.js` — for each issue, draw a mini SVG or Canvas bar chart using the event counts bucketed by day
  - [x] 3.12 Add bulk action handling in `public/js/issues.js` — track checked checkboxes, enable/disable toolbar buttons, send `POST /issues/bulk` on button click, re-render the list
  - [x] 3.13 Create `public/js/issue-detail.js` — fetch `GET /issues/:id`, render stack trace with syntax-friendly formatting, render event history list with timestamps and metadata

- [x] 4.0 Logs
  - [x] 4.1 Add schema to `db/schema.sql` for table: `logs` (project_id, timestamp, level, message, service, metadata); add composite index on `(project_id, timestamp, level)`
  - [x] 4.2 Build `POST /api/v1/logs` (API key protected) — validate payload (level must be one of FATAL, ERROR, WARN, INFO, DEBUG), insert log entry
  - [x] 4.3 Build `GET /logs` — cursor-based paginated log feed for the current org; filterable by `level`, `service`, `projectId`, `timeRange`; supports keyword search on `message`; returns a `nextCursor` for the next page
  - [x] 4.4 Build `GET /logs/services` — return list of distinct `service` values for the current org (used to populate the Service filter dropdown)
  - [x] 4.5 Create `views/logs/index.html` — dark terminal-style log feed panel; filter bar above with Level dropdown, Service dropdown, and search input; "Load more" button at the bottom
  - [x] 4.6 Create `public/js/logs.js` — on page load fetch first page of logs; render each entry as a row with timestamp, color-coded level badge (FATAL/ERROR = red, WARN = yellow, INFO = blue, DEBUG = gray), and message; populate Service dropdown from `GET /logs/services`
  - [x] 4.7 Add filter and search handling in `public/js/logs.js` — re-fetch from the top when filters change; implement "Load more" button that appends the next cursor page to the existing feed without clearing it

- [x] 5.0 Performance Monitoring
  - [x] 5.1 Add schema to `db/schema.sql` for table: `transactions` (project_id, name, http_method, duration_ms, status_code, environment, timestamp); add index on `(project_id, name)`
  - [x] 5.2 Build `POST /api/v1/transactions` (API key protected) — validate payload, insert transaction record
  - [x] 5.3 Build `GET /transactions/groups` — group transactions by `name`, return each group with: name, project, transaction count, and average duration; filterable by `environment`, `projectId`; sortable by `avg_duration` (default: slowest first)
  - [x] 5.4 Build `GET /transactions` — return individual transaction records for a given `name` (used for the detail view); paginated
  - [x] 5.5 Create `views/performance/list.html` — transaction groups table with columns: Title, Project, Transactions, Avg Duration; Sort By dropdown (Slowest / Fastest); Environment and Project filters
  - [x] 5.6 Create `views/performance/detail.html` — detail view for a transaction group showing individual transaction samples in a table (timestamp, duration, status code, environment)
  - [x] 5.7 Create `public/js/performance.js` — on page load fetch `GET /transactions/groups`; render table rows; wire up sort and filter controls to re-fetch; clicking a row navigates to the detail page
  - [x] 5.8 Create `public/js/performance-detail.js` — read group name from the URL, fetch `GET /transactions`, render the samples table with pagination

- [x] 6.0 Uptime Monitoring
  - [x] 6.1 Add schema to `db/schema.sql` for tables: `monitors` and `ping_results`; added `status_changed_at` via safe ALTER TABLE migration in `database.js`
  - [x] 6.2 Build `POST /monitors` — create monitor, validate URL, default 60s interval
  - [x] 6.3 Build `GET /monitors/api` — list monitors with last_status and status_changed_at for duration display
  - [x] 6.4 Build `DELETE /monitors/:id` — remove monitor and cascade-delete ping history
  - [x] 6.5 Build `GET /monitors/:id/pings` — last N pings oldest-first for timeline rendering
  - [x] 6.6 Create `services/scheduler.js` — node-cron every minute, batched HTTP GET pings, records results
  - [x] 6.7 Status transition detection in scheduler — updates `status_changed_at`, triggers email + webhook alerts
  - [x] 6.8 `services/email.js` — sendDownAlert + sendRecoveryAlert (done in task 2)
  - [x] 6.9 `services/webhook.js` — POST with 3-retry exponential backoff
  - [x] 6.10 Create `views/uptime/index.html` — monitor cards with timeline bar, status label, add/delete UI
  - [x] 6.11 Create `public/js/uptime.js` — fetch monitors + pings, render timeline `<div>` segments
  - [x] 6.12 Add monitor modal — fetch POST, append card without reload
  - [x] 6.13 Delete monitor — confirm, DELETE request, remove card from DOM
