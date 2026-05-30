# PRD: GlitchRadar

## 1. Introduction / Overview

GlitchRadar is a multi-tenant SaaS observability platform for small development teams (2–10 engineers). It consolidates error tracking, application logs, performance monitoring, and uptime monitoring into a single dashboard — eliminating the need to juggle multiple tools when debugging production issues.

Teams integrate by sending data to GlitchRadar via a simple REST API (HTTP endpoints). No SDK or agent installation is required. The platform is built around the concept of **Projects** (one per app/service) grouped under **Organizations** (one per team).

The four features are delivered in priority order: Error Tracking → Logs → Performance Monitoring → Uptime Monitoring.

---

## 2. Goals

- Give small dev teams a single place to detect, investigate, and resolve production issues.
- Keep integration friction minimal — a single HTTP POST is enough to start sending data.
- Support multi-tenant usage with organization-level isolation, project grouping, and team member invitations.
- Deliver a clean, fast UI that surfaces the most actionable information first.

---

## 3. User Stories

**Authentication & Organizations**
- As a developer, I can sign up and create an organization so my team's data is isolated from other teams.
- As an admin, I can invite teammates to my organization so we can collaborate on the same projects.
- As a team member, I can switch between projects within my organization.

**Error Tracking**
- As a developer, I can send error events to GlitchRadar via a REST API so I don't need to install an SDK.
- As a developer, I can see a list of all issues (grouped errors) with their trend, event count, and last-seen time so I can prioritize what to fix.
- As a developer, I can mark issues as resolved, unresolved, or ignored so the list stays clean.
- As a developer, I can search and filter issues by status (unresolved/resolved/ignored) and environment so I can narrow down what I'm looking at.

**Logs**
- As a developer, I can send log entries (INFO, WARN, ERROR, FATAL) to GlitchRadar via a REST API.
- As a developer, I can search and filter logs by level and service so I can find relevant entries quickly.
- As a developer, I can view logs in a real-time-style feed alongside errors so I don't need to switch tools.

**Performance Monitoring**
- As a developer, I can send transaction data (route name, duration) to GlitchRadar via a REST API.
- As a developer, I can see transaction groups ranked by average duration so I can identify the slowest parts of my app.
- As a developer, I can filter transactions by environment and project.

**Uptime Monitoring**
- As a developer, I can add a URL to monitor and GlitchRadar will ping it on a schedule.
- As a developer, I receive an email or webhook alert when a monitored URL stops responding.
- As a developer, I can see a visual timeline of up/down status per monitor so I can understand historical availability.

---

## 4. Functional Requirements

### 4.1 Authentication & Multi-Tenancy

1. The system must allow users to sign up with an email and password.
2. The system must allow a user to create an **Organization** upon signup.
3. The system must allow organization admins to invite users by email.
4. The system must allow users to create multiple **Projects** within an organization.
5. Each project must have a unique **API key** used to authenticate inbound REST API requests.
6. Users must only be able to view data belonging to their organization.

### 4.2 Error Tracking

7. The system must expose a `POST /api/v1/errors` endpoint that accepts error events (message, stack trace, environment, level, timestamp, and optional metadata).
8. The system must group duplicate errors into a single **Issue** using the error message and stack trace fingerprint.
9. The system must display a paginated list of issues showing: title, project, age (first seen), last seen, event count, and a sparkline trend chart.
10. Each issue must have a status: `unresolved` (default), `resolved`, or `ignored`.
11. The system must allow users to bulk-update issue status (mark resolved, unresolved, ignored, or merge duplicates).
12. The system must allow users to search issues by keyword and filter by status (`is:unresolved`, `is:resolved`, `is:ignored`).
13. The system must allow filtering by **Environment** (e.g., production, staging) and **Time Range** (24h, 14d, all time).
14. The system must allow sorting issues by Last Seen (default), First Seen, and Event Count.
15. Clicking an issue must open a detail view showing the full stack trace, event history, and metadata.

### 4.3 Logs

16. The system must expose a `POST /api/v1/logs` endpoint that accepts log entries (timestamp, level, message, service, and optional metadata).
17. Supported log levels must be: `FATAL`, `ERROR`, `WARN`, `INFO`, `DEBUG`.
18. The system must display logs in a reverse-chronological feed styled as a terminal/console view with color-coded levels.
19. The system must allow users to search logs by keyword and filter by level and service.
20. The system must support "Load more" pagination for the log feed.
21. The system must allow filtering logs by project and time range.

### 4.4 Performance Monitoring

22. The system must expose a `POST /api/v1/transactions` endpoint that accepts transaction data (name/route, HTTP method, duration in ms, status code, environment, timestamp).
23. The system must group transactions by name into **Transaction Groups** and calculate the average duration per group.
24. The system must display a list of transaction groups showing: title, project, transaction count, and average duration.
25. The system must allow sorting transaction groups by Slowest (default) and Fastest.
26. The system must allow filtering by environment and project.
27. Clicking a transaction group must open a detail view showing individual transaction samples.

### 4.5 Uptime Monitoring

28. The system must allow users to add a **Monitor** by providing a name and URL.
29. The system must ping each monitored URL via HTTP GET on a configurable schedule (default: every 1 minute).
30. The system must record each ping result (up/down, response time, HTTP status code, timestamp).
31. The system must display a visual timeline bar for each monitor showing up (green) and down (red) intervals.
32. Each monitor must display its current status and how long it has been in that state (e.g., "Down for 21 hours").
33. The system must send an **email alert** to organization members when a monitor transitions from up to down.
34. The system must support **webhook alerts** — users can configure a webhook URL per monitor that receives a POST payload when the monitor goes down or recovers.
35. The system must display a list of all monitors in the organization, paginated.

---

## 5. Non-Goals (Out of Scope)

- **SDK or agent-based integration** — all data ingestion is via REST API only in this version.
- **Source maps / code context** — no server-side source map processing for stack traces.
- **Real-time streaming** — the log and error feeds will refresh on demand (no WebSocket/SSE in v1).
- **Custom alerting rules for errors or performance** — alerts are limited to uptime down/recovery events in v1.
- **SSO / OAuth login** — email/password auth only.
- **Public status pages** — uptime data is internal only.
- **Data retention policies** — no configurable retention limits in v1.
- **Mobile app** — web only.

---

## 6. Design Considerations

The mockups (see `/docs/mockup/`) define the visual direction for all four sections:

- **Typography (Google Fonts):**
  - Primary: **Zalando Sans** — used for headings, labels, and navigation.
  - Secondary: **JetBrains Mono** — used for body text, paragraphs, descriptions, and monospace contexts (log feed, stack traces, API keys, code snippets, terminal-style log viewer).
  - Both fonts are loaded via Google Fonts and referenced as CSS custom properties in `main.css` (e.g., `--font-primary`, `--font-mono`).
- **Global layout:** Left sidebar navigation with icons for each module (Error Tracking, Logs, Performance, Uptime). Top-right shows project/org switcher and time range selector.
- **Error Tracking (`error-tracking.webp`):** Table with checkboxes for bulk actions, sparkline trend charts per issue, event count column. Toolbar with Mark Resolved / Mark Unresolved / Mark Ignored / Merge buttons.
- **Performance Monitoring (`performance-monitoring.webp`):** Clean table showing transaction group name, project, transaction count, and average duration. Sort by "Slowest" default.
- **Uptime Monitoring (`uptime-monitoring.webp`):** List view with monitor name, URL, colored bar timeline (green = up, red = down), and human-readable downtime label. "+ Add monitor" CTA in top-right.
- **Logs (`error-logs-monitoring.webp`):** Dark terminal-style log viewer. Color-coded log level badges (FATAL = red, ERROR = red/orange, WARN = yellow, INFO = blue). Filters for Level and Service above the feed.

---

## 7. Technical Considerations

- **Backend:** Express.js (Node.js). All REST API endpoints, authentication middleware, uptime ping scheduling, and webhook/email delivery are handled by an Express server.
- **Database:** SQLite. All application data (organizations, projects, errors, logs, transactions, monitors, ping results) is stored in a single SQLite file. Use WAL mode for better read/write concurrency. Ensure every query is scoped to the organization for multi-tenancy isolation.
- **Frontend:** Vanilla JavaScript (no frameworks). All interactivity — DOM manipulation, fetch calls to the REST API, filtering, sorting, pagination, and form handling — is written in plain JS. No React, Vue, or similar.
- **Styling:** Tailwind CSS handles component-level utility styles (layout, spacing, colors, typography). A `main.css` file is used for global/primary styles — base resets, CSS custom properties (design tokens), and any styles that don't fit cleanly into Tailwind utilities (e.g., the terminal-style log viewer, sparkline charts).
- **Data ingestion endpoints** must authenticate requests using the project's API key (sent as a header, e.g., `X-API-Key`).
- **Issue fingerprinting** for error grouping should use a hash of the normalized error message + top-N stack frames.
- **Uptime ping scheduler** needs a reliable background job system (e.g., a cron worker or task queue). Consider rate-limiting pings to avoid hammering monitored services.
- **Webhook delivery** should be queued and retried on failure (at least 3 retries with backoff).
- **Log volume** can be high — use proper SQLite indexes on (project_id, timestamp, level) and prefer cursor-based pagination over offset for the log feed.
- **Email alerts** require a transactional email service (e.g., Resend, SendGrid, or Postmark).

---

## 8. Success Metrics

- A developer can integrate and see their first error in GlitchRadar within **5 minutes** of signing up.
- Users can add a URL monitor and receive a downtime alert end-to-end without reading documentation.
- Error grouping accuracy — fewer than 5% of issues are misidentified duplicates or false splits (validated by internal testing).
- Uptime ping latency — monitors are checked within ±10 seconds of their scheduled interval.
- Team adoption — at least 2 members per organization have logged in within 7 days of org creation.

---

## 9. Open Questions

1. **Ping interval** — Should the default uptime check interval (1 minute) be configurable per monitor in v1, or fixed?
2. **Log retention** — How long should logs, errors, and transactions be stored before being deleted? (e.g., 30 days, 90 days)
3. **Pricing / limits** — Are there plan-based limits (e.g., max events per month, max monitors) to account for in v1?
4. **Alert recipients** — Should downtime alerts go to all org members or only configurable contacts per monitor?
5. **Error rate alerts** — Is there a desire to alert when error volume spikes beyond a threshold (even if out of scope for v1, good to plan the data model for)?
