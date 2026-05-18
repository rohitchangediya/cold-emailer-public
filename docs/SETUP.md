# Setup Guide

This guide covers first-time local and platform setup.

## 1) Prerequisites

- Google account with access to Gmail + Google Sheets + Apps Script.
- Cloudflare account with Workers enabled.
- Node.js 18+ and npm.
- `wrangler` via `npx wrangler ...`.

## 2) Prepare Google Sheet

Create a sheet tab (default `Leads`) with columns in this order:

`firstName, lastName, company, email, status, threadIds, lastEmailDate, initialSendDate, notes, opened, lastOpened, clicked, lastClicked, clickedLinks, trackingIds, bounceReason, bounceDate, unsubscribed, replySentiment, lastReplyText`

## 3) Prepare Apps Script project

1. Open the sheet.
2. Go to `Extensions` -> `Apps Script`.
3. Add files from this repo:
   - `Config.gs` (copy from `Config.example.gs` and customize)
   - `EmailTemplates.gs`
   - `Code.gs`
   - `Tracking.gs`
4. Set required values in `Config.gs`:
   - `SHEET_ID`
   - `SENDER_NAME`
   - `TRACKING_BASE_URL`
   - `TRACKING_WEBHOOK_SECRET`

## 4) Deploy Apps Script as Web App

Deploy `Tracking.gs` webhook endpoint:

1. `Deploy` -> `New deployment` -> `Web app`.
2. Execute as: `Me`.
3. Who has access: `Anyone`.
4. Copy the web app URL ending with `/exec`.

Use this format for reliability:

`https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`

## 5) Prepare Worker locally

From `cloudflare-worker/`:

```bash
npm install
cp .dev.vars.example .dev.vars
```

Set `.dev.vars` for local `wrangler dev` use:

```bash
APPS_SCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
TRACKING_WEBHOOK_SECRET=<same-secret-as-config-gs>
```

## 6) Set production Worker secrets

```bash
npx wrangler secret put APPS_SCRIPT_WEBHOOK_URL
npx wrangler secret put TRACKING_WEBHOOK_SECRET
```

## 7) Deploy Worker

```bash
npx wrangler deploy
```

Copy deployed Worker URL into `Config.gs` as:

- `TRACKING_BASE_URL`
- and optionally `UNSUBSCRIBE_URL` if using custom unsubscribe path.

## 8) Authorize and run first send

In Apps Script editor:

1. Run `runColdEmailer` manually once.
2. Grant required permissions.
3. Verify sheet updates and sent email.
