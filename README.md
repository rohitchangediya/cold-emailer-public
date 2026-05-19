# Cold Emailer

Automated outbound email sequencing built with Google Apps Script, Google Sheets, Gmail, and Cloudflare Workers.

## What this project does

- Sends personalized cold emails from sheet-based lead data.
- Progresses follow-up sequence based on elapsed days and reply state.
- Stops sends when replies are detected across tracked thread IDs.
- Stores reply sentiment (`positive | negative | neutral`) and last reply text.
- Tracks opens, clicks, and unsubscribes via a Cloudflare Worker.
- On unsubscribe, marks `unsubscribed=true` and sets status to `skip` (unless already `replied`).
- Detects likely bounces from Gmail inbox and marks lead status.
- Stores campaign state and engagement metrics directly in Google Sheets.

## Documentation Index

- Setup: `docs/SETUP.md`
- Deployment: `docs/DEPLOYMENT.md`
- Architecture + diagram: `docs/ARCHITECTURE.md`
- Example workflows: `docs/EXAMPLE_WORKFLOWS.md`
- Contributor guide: `CONTRIBUTING.md`
- Worker-specific notes: `cloudflare-worker/README.md`

## Quick Start

1. Copy `Config.example.gs` values into your Apps Script `Config.gs`.
2. Set up the sheet columns in the exact configured order.
3. Deploy Apps Script as Web App (`/exec`) with access set to `Anyone`.
4. Configure Worker secrets:
   - `APPS_SCRIPT_WEBHOOK_URL`
   - `TRACKING_WEBHOOK_SECRET`
5. Deploy Worker with `npx wrangler deploy`.
6. Set `TRACKING_BASE_URL` in Apps Script to deployed Worker URL.
7. Run `runColdEmailer` once manually to authorize and validate flow.

## Core Components

- `Code.gs`: send loop, status progression, reply detection, trigger setup.
- `Tracking.gs`: webhook handler (`doPost`), event persistence, bounce detection.
- `EmailTemplates.gs`: initial + follow-up templates and unsubscribe footer.
- `Config.example.gs`: all configurable knobs and column index mapping.
- `cloudflare-worker/src/index.js`: `/open`, `/click`, `/unsubscribe`, `/health` endpoints.

## Operational Statuses

| Status | Meaning |
|---|---|
| `""` | lead not contacted yet |
| `sent` | initial email sent |
| `followed_up_1` | first follow-up sent |
| `followed_up_2` | second follow-up sent |
| `followed_up_3` | third follow-up sent |
| `replied` | reply detected |
| `dead` | no further outreach (terminal) |
| `skip` | excluded (manual or unsubscribe) |
| `bounced` | delivery failure detected |

## Troubleshooting Snapshot

- If Worker logs show `Tracking webhook failed 401`, verify:
  - web app URL is `https://script.google.com/macros/s/.../exec`.
  - Apps Script deployment access is `Anyone`.
  - shared secret matches in both systems.
- Use `npx wrangler tail` while testing `/click` and `/open` URLs.
- Seeing two unsubscribe links in Gmail can be normal: one is Gmail UI, one is app footer.

## License

Licensed under `AGPL-3.0-or-later`. See `LICENSE`.

