# GlitchRadar

A multi-tenant SaaS observability platform for small development teams. GlitchRadar consolidates error tracking, application logs, performance monitoring, and uptime monitoring into a single dashboard — eliminating the need to juggle multiple tools when debugging production issues.

Teams integrate by sending data via a simple REST API. No SDK or agent installation required.

## Features

**Error Tracking** — Report exceptions and log messages. Errors are grouped into issues by fingerprint, with trend sparklines, event counts, and bulk triage actions (resolve, ignore, merge).

**Logs** — Search and filter application logs by level and service in a terminal-style feed. Levels: `FATAL`, `ERROR`, `WARN`, `INFO`, `DEBUG`.

**Performance Monitoring** — Send transaction data and see routes grouped by average duration. Identify your slowest endpoints at a glance.

**Uptime Monitoring** — GlitchRadar pings your URLs on a schedule and alerts you via email or webhook when a site goes down or recovers.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Express.js (Node.js) |
| Database | SQLite (WAL mode) |
| Frontend | Vanilla JavaScript |
| Styles | SCSS → Tailwind CSS v4 |
| Fonts | Zalando Sans / JetBrains Mono (Google Fonts) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Run (development)

Open three terminals:

```bash
# Terminal 1 — Express server with auto-reload
npm run dev

# Terminal 2 — Compile SCSS and watch for changes
npm run scss:watch

# Terminal 3 — Bundle Tailwind + compiled SCSS, watch for changes
npm run css:watch
```

The app will be available at `http://localhost:3000`.

### Build for production

```bash
npm run build
```

This compiles SCSS then bundles everything through Tailwind in one command.

## Customization

All design tokens — colors, typography, spacing, and geometry — live in one file:

```
app/public/scss/_variables.scss
```

Change `$color-brand`, `$font-primary`, `$color-bg`, or any spacing/radius variable there, run `npm run build`, and the entire UI updates.

## Project Structure

```
GlitchRadar/
├── app/
│   ├── server.js                  # Express entry point
│   ├── db/
│   │   ├── database.js            # SQLite connection (WAL mode + migrations)
│   │   └── schema.sql             # Full database schema
│   ├── middleware/
│   │   ├── auth.js                # Session auth guard
│   │   └── apiKey.js              # API key validation for ingest endpoints
│   ├── routes/
│   │   ├── auth.js
│   │   ├── invite.js
│   │   ├── organizations.js
│   │   ├── projects.js
│   │   ├── errors.js              # /issues routes
│   │   ├── logs.js
│   │   ├── transactions.js
│   │   ├── monitors.js
│   │   └── ingest/                # POST /api/v1/* endpoints
│   ├── controllers/               # Business logic per module
│   ├── services/
│   │   ├── fingerprint.js         # Error fingerprinting (SHA-256)
│   │   ├── scheduler.js           # Uptime ping scheduler (node-cron)
│   │   ├── email.js               # Transactional email alerts
│   │   └── webhook.js             # Webhook delivery with retry/backoff
│   ├── public/
│   │   ├── scss/                  # SCSS source (edit these)
│   │   │   ├── main.scss          # Entry — @use import order
│   │   │   ├── _variables.scss    # All design tokens ($color-brand, $font-*, etc.)
│   │   │   ├── _reset.scss
│   │   │   ├── _layout.scss       # Sidebar, topbar, page shell
│   │   │   ├── _buttons.scss
│   │   │   ├── _forms.scss        # .form-input, .form-label, .form-group
│   │   │   ├── _tables.scss       # .data-table, .card
│   │   │   ├── _badges.scss       # Status + log-level badges
│   │   │   ├── _modals.scss       # .modal-overlay, .modal-card
│   │   │   ├── _log-terminal.scss # Terminal-style log viewer
│   │   │   └── _uptime.scss       # Timeline bar, sparkline, empty state
│   │   ├── css/
│   │   │   ├── entry.css          # Tailwind entry (@import tailwindcss + custom.css)
│   │   │   ├── custom.css         # Compiled SCSS output (generated)
│   │   │   └── output.css         # Final bundle served by Express (generated)
│   │   └── js/                    # Vanilla JS per page
│   └── views/                     # Handlebars HTML templates
│       ├── layouts/
│       │   ├── main.html          # App shell (sidebar + topbar)
│       │   └── auth.html          # Centered auth layout
│       ├── auth/
│       ├── issues/
│       ├── logs/
│       ├── performance/
│       ├── uptime/
│       └── projects/
├── docs/mockup/                   # UI mockups
├── tasks/                         # PRD and task list
└── package.json
```

## npm Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Express with nodemon (auto-reload) |
| `npm run start` | Start Express (production) |
| `npm run scss:build` | Compile SCSS → `custom.css` once |
| `npm run scss:watch` | Compile SCSS and watch for changes |
| `npm run css:build` | Bundle Tailwind + `custom.css` → `output.css` once |
| `npm run css:watch` | Bundle Tailwind and watch for changes |
| `npm run build` | Full production build (`scss:build` + `css:build`) |
| `npm run dev:css` | Run both CSS watchers in parallel |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `SESSION_SECRET` | *(dev fallback)* | Express session secret — **set this in production** |
| `SMTP_HOST` | `localhost` | SMTP server host |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `SMTP_FROM` | `noreply@glitchradar.io` | Sender address for alerts |
| `APP_URL` | `http://localhost:3000` | Public base URL (used in invite and alert emails) |

## REST API

All ingest endpoints authenticate via the `X-API-Key` header. API keys are generated per-project in the Projects settings page.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/errors` | Ingest an error event |
| `POST` | `/api/v1/logs` | Ingest a log entry |
| `POST` | `/api/v1/transactions` | Ingest a transaction |

### Error event payload

```json
{
  "message": "TypeError: Cannot read properties of undefined",
  "stack_trace": "...",
  "level": "error",
  "environment": "production",
  "timestamp": "2026-05-30T10:00:00Z",
  "metadata": {}
}
```

### Log entry payload

```json
{
  "level": "ERROR",
  "message": "Failed to connect to database",
  "service": "api",
  "timestamp": "2026-05-30T10:00:00Z",
  "metadata": {}
}
```

### Transaction payload

```json
{
  "name": "GET /api/v2/orders",
  "http_method": "GET",
  "duration_ms": 322,
  "status_code": 200,
  "environment": "production",
  "timestamp": "2026-05-30T10:00:00Z"
}
```

## License

ISC
