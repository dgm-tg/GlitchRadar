# GlitchRadar

A multi-tenant SaaS observability platform for small development teams. GlitchRadar consolidates error tracking, application logs, performance monitoring, and uptime monitoring into a single dashboard — eliminating the need to juggle multiple tools when debugging production issues.

Teams integrate by sending data via a simple REST API. No SDK or agent installation required.

## Features

**Error Tracking** — Report exceptions, log messages, and CSP violations. Errors are grouped into issues by fingerprint, with trend sparklines, event counts, and bulk triage actions (resolve, ignore, merge).

**Logs** — Search and filter application logs by level and service in a terminal-style feed. Levels: `FATAL`, `ERROR`, `WARN`, `INFO`, `DEBUG`.

**Performance Monitoring** — Send transaction data and see routes grouped by average duration. Identify your slowest endpoints at a glance.

**Uptime Monitoring** — GlitchRadar pings your URLs on a schedule and alerts you via email or webhook when a site goes down or recovers.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Express.js (Node.js) |
| Database | SQLite (WAL mode) |
| Frontend | Vanilla JavaScript |
| Styling | Tailwind CSS + `main.css` |
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

In two terminals:

```bash
# Terminal 1 — Express server with auto-reload
npm run dev

# Terminal 2 — Tailwind CSS in watch mode
npm run css:watch
```

The app will be available at `http://localhost:3000`.

### Build CSS for production

```bash
npm run css:build
```

## Project Structure

```
GlitchRadar/
├── app/
│   ├── server.js              # Express entry point
│   ├── db/
│   │   ├── database.js        # SQLite connection (WAL mode)
│   │   └── schema.sql         # Full database schema
│   ├── middleware/
│   │   ├── auth.js            # Session auth guard
│   │   └── apiKey.js          # API key validation for ingest endpoints
│   ├── routes/
│   │   ├── auth.js
│   │   ├── organizations.js
│   │   ├── projects.js
│   │   ├── errors.js
│   │   ├── logs.js
│   │   ├── transactions.js
│   │   ├── monitors.js
│   │   └── ingest/            # POST /api/v1/* endpoints
│   ├── controllers/
│   ├── services/
│   │   ├── fingerprint.js     # Error fingerprinting
│   │   ├── scheduler.js       # Uptime ping scheduler
│   │   ├── email.js           # Email alerts
│   │   └── webhook.js         # Webhook delivery with retry
│   ├── public/
│   │   ├── css/
│   │   │   ├── main.css       # Global styles & design tokens
│   │   │   └── output.css     # Tailwind compiled output
│   │   └── js/                # Vanilla JS per page
│   └── views/                 # HTML templates
├── docs/mockup/               # UI mockups
├── tasks/                     # PRD and task list
└── package.json
```

## REST API

All ingest endpoints authenticate via the `X-API-Key` header (per-project key).

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