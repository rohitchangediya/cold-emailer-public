# Cloudflare Worker Tracking

This Worker exposes public tracking endpoints for email opens and clicks, then posts those events back to your Apps Script so the Google Sheet stays the source of truth.

## Endpoints

- `/open?id=TRACKING_ID` returns a 1x1 GIF and notifies Apps Script.
- `/click?id=TRACKING_ID&url=https%3A%2F%2Fexample.com` notifies Apps Script, then returns a real `302` redirect.
- `/health` returns a simple JSON status response.

## Setup

1. Deploy `Tracking.gs` as a Google Apps Script web app.
2. In `Config.gs`, set:
   - `TRACKING_BASE_URL` to your Worker URL
   - `TRACKING_WEBHOOK_SECRET` to a long random string
3. In this folder, create `.dev.vars` from `.dev.vars.example`.
4. Set the same values there:
   - `APPS_SCRIPT_WEBHOOK_URL`
   - `TRACKING_WEBHOOK_SECRET`

## Local development

```bash
npm install
npm run dev
```

## Deploy

```bash
npx wrangler deploy
```

After deploy, copy the Worker URL into `Config.gs` as `TRACKING_BASE_URL`, then send a fresh test email.
