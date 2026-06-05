# Planhat CSP — Workshop MVP

A demo Customer Success Platform for CSMs, built end-to-end as a single Next.js app. Optimised for a workshop walkthrough: clean, working, and easy to poke at.

## Run it locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. An **in-memory libSQL** database is created and seeded on first request — no migration step, no file on disk.

The DB resets every time the dev server restarts (or, in production, on every cold start). For a workshop demo this is a feature: each session starts clean.

## Deploy to Vercel

The app is serverless-friendly (no native modules, no file I/O). To deploy:

1. Go to <https://vercel.com/new> and import this GitHub repo.
2. Accept the defaults — Vercel auto-detects Next.js.
3. (Optional) Add `SLACK_WEBHOOK_URL` under **Environment Variables**.
4. Click **Deploy**.

That's it. Every push to `main` (or whichever branch you connect) redeploys automatically.

## Slack integration (optional)

If `SLACK_WEBHOOK_URL` is unset, alerts are logged to the server console instead of failing. To wire up Slack:

1. Create an **Incoming Webhook** in Slack: <https://api.slack.com/messaging/webhooks>.
2. Copy `.env.local.example` to `.env.local` and paste the webhook URL.
3. Restart `npm run dev`.

Alerts fire in two situations:
- **Manual**: the "Send Slack alert" button on a churn-risk customer detail page (`POST /api/alerts/slack`).
- **Auto**: any time a server-side action recomputes a customer's health and it lands in the red band or churn-risk state. The same customer is not re-alerted more than once per 24h (`alerted_at` is stamped on the customer row). Trigger this by logging a touchpoint — when the customer is already red/at-risk, an alert fires.

## Health-score formula

Health is computed (never stored) in `lib/health.ts`. Weights are named constants at the top of the file:

- **Usage** — 50%. `usage` (0–100) is used as-is.
- **Support load** — 25%. `100 − (open_tickets / 10) × 100`, clamped 0–100. So 0 tickets = full marks; 10+ tickets = 0.
- **NPS** — 25%. NPS (−100..100) linearly remapped to 0..100.

The three normalized axes are multiplied by their weights and summed, then rounded to the nearest integer.

Bands: **green ≥ 70**, **amber 40–69**, **red < 40**.

A customer is **churn risk** if:
- health is in the red band (< 40), **or**
- renewal is within 60 days **and** health < 60.

## Project structure

```
app/
  layout.tsx                       # Shell (sidebar + main)
  page.tsx                         # Customer list (/)
  customers/[id]/page.tsx          # Customer detail (/customers/:id)
  api/
    customers/route.ts             # GET list
    customers/[id]/route.ts        # GET single
    customers/[id]/activities/route.ts  # GET / POST touchpoints; auto-fires Slack alert
    alerts/slack/route.ts          # POST manual Slack alert
components/
  Sidebar.tsx
  CustomerTable.tsx                # Sortable table (default: lowest health first)
  HealthBadge.tsx                  # Colored badge + dot
  ChurnFlag.tsx                    # 🚩 indicator
  ActivityTimeline.tsx
  LogTouchpointForm.tsx            # Posts to API, then router.refresh()
  SlackAlertButton.tsx             # Manual alert trigger
lib/
  db.ts                            # libSQL in-memory client + schema + seed-on-first-run
  seed.ts                          # 18 engineered customers w/ contacts & activities
  health.ts                        # Pure health function + churn-risk rule
  customers.ts                     # Async read/write helpers + maybeAutoAlert
  slack.ts                         # Webhook poster + console fallback
  types.ts
.env.local.example                 # SLACK_WEBHOOK_URL placeholder
```

## What's in the demo data

- 18 customers — roughly **8 green / 6 amber / 4 red**.
- **3 customers** are churn-risk via the "renewal ≤ 60d + health < 60" rule:
  - **Mediterraneo SaaS** — health ~59, renews in 30 days
  - **Hanseatic Bank** — health ~53, renews in 45 days
  - **Albatross Media** — health ~53, renews in 55 days
- All 4 red customers are also churn-risk by definition.
- Each customer has 2–4 contacts and 4–8 timeline activities spread over the last 90 days.

## Things to try in the workshop

1. **Open the list** — note the summary strip and the colored health badges; default sort is lowest health first.
2. **Click a red customer** (e.g. Atlas Telecom). Notice the churn-risk banner, health breakdown, contacts, and timeline.
3. **Log a touchpoint** on a red customer. The timeline updates immediately, and a Slack alert fires (or is console-logged) because the customer is already in the alert state.
4. **Send a manual alert** with the "Send Slack alert" button. The button switches to "✓ Slack alert sent" or "✓ Logged to console" depending on whether `SLACK_WEBHOOK_URL` is set.
5. **Tweak the weights** in `lib/health.ts` and refresh — every score recomputes on read.

## Assumptions

- No auth: the workshop demo has no login. The Slack webhook URL is server-side via `.env.local` (or Vercel env var), never exposed to the browser.
- **Storage is in-memory libSQL.** Touchpoints persist within a warm instance but are wiped on cold start. For a workshop demo this is intentional (fresh seed per session). If you need durable storage, swap `:memory:` in `lib/db.ts` for a Turso (`libsql://…`) URL + auth token.
- "CSM" defaults to a fixed roster in the seed; touchpoints default the author field to the assigned CSM but you can edit it.
- "Days to renewal" can go negative if the renewal date has passed; the churn-risk rule treats negative as outside the 60-day window (red health still catches it).
- Activities are append-only — there is no edit/delete UI.
- The 24h alert cooldown is wall-clock per customer, tracked via `customers.alerted_at`. The manual alert button always sends and updates `alerted_at`, intentionally — manual is a manual override.
