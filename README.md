# Cold Emailer — Google Apps Script

Automated cold email system with follow-ups and reply detection, built on Google Apps Script + Google Sheets.

---

## Features

- Sends personalized cold emails using `{{firstName}}` and `{{company}}` placeholders
- Auto follow-up 3 times (2, 5, and 9 days after initial send) if no reply
- Detects replies via Gmail thread — stops follow-ups automatically
- **Email open tracking** — 1x1 pixel to detect when emails are viewed
- **Link click tracking** — track which links are clicked and when
- **Bounce detection** — auto-detect delivery failures and mark leads as bounced
- All leads, statuses, and engagement tracked in Google Sheets
- Daily time-based trigger for fully automated runs

---

## Setup

### Step 1 — Create the Google Sheet

Create a new Google Sheet with the following columns **in order**:

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| firstName | lastName | company | email | status | threadIds | lastEmailDate | initialSendDate | notes | opened | lastOpened | clicked | lastClicked | clickedLinks | trackingIds | bounceReason | bounceDate |

- Row 1 should be the **header row** (exact names don't matter, just the order)
- Add your leads starting from **Row 2** (columns A-D only)
- Leave all columns from E onward blank — the script fills them automatically

**Note:** Columns J-Q are optional tracking columns. If you don't want tracking, you can stop at column I.

### Step 2 — Create the Apps Script Project

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Delete the default `Code.gs` content
4. Create four files and paste the contents:
   - `Config.gs` → paste `Config.gs`
   - `EmailTemplates.gs` → paste `EmailTemplates.gs`
   - `Code.gs` → paste `Code.gs`
   - `Tracking.gs` → paste `Tracking.gs`

### Step 3 — Configure

In `Config.gs`, update:

```javascript
SHEET_ID: "YOUR_GOOGLE_SHEET_ID_HERE",  // From the Sheet URL
SENDER_NAME: "Your Name",
INITIAL_SUBJECT: "Quick question for {{company}}",

// Tracking settings
ENABLE_OPEN_TRACKING: true,      // Set false to disable open tracking
ENABLE_CLICK_TRACKING: true,     // Set false to disable click tracking
ENABLE_BOUNCE_DETECTION: true,   // Set false to disable bounce detection
```

Get your Sheet ID from the URL:
```
https://docs.google.com/spreadsheets/d/THIS_IS_YOUR_SHEET_ID/edit
```

### Step 4 — Set Up Tracking (Optional)

To enable reliable open/click tracking, deploy `Tracking.gs` as a webhook receiver and the `cloudflare-worker/` subfolder as the public tracking endpoint.

#### 4A. Deploy `Tracking.gs` as a webhook receiver

1. In Apps Script, click **Deploy → New deployment**
2. Click the settings icon ⚙️ and select **Web app**
3. Set **Execute as:** Me
4. Set **Who has access:** Anyone
5. Click **Deploy** and copy the Web App URL

#### 4B. Configure Apps Script

In `Config.gs`, set:

```javascript
TRACKING_BASE_URL: "https://your-worker.your-subdomain.workers.dev",
TRACKING_WEBHOOK_SECRET: "replace-with-a-long-random-secret",
```

#### 4C. Deploy the Cloudflare Worker

1. Open the [`cloudflare-worker`](./cloudflare-worker) folder
2. Create `.dev.vars` from `.dev.vars.example`
3. Set:
   ```bash
   APPS_SCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   TRACKING_WEBHOOK_SECRET=replace-with-the-same-secret-from-config-gs
   ```
4. Run:
   ```bash
   npm install
   npx wrangler deploy
   ```
5. Copy the deployed Worker URL into `Config.gs` as `TRACKING_BASE_URL`

**How it works:**
- **Open tracking:** A 1x1 pixel is served by the Worker, and the Worker posts the open event back to Apps Script.
- **Click tracking:** Links are rewritten to the Worker, which logs the click back to Apps Script and then returns a real `302` redirect.

### Step 5 — Customize Email Templates

Edit `EmailTemplates.gs` to write your actual email copy:
- `getInitialEmailBody()` — your cold email
- `getFollowUp1Body()` — first follow-up
- `getFollowUp2Body()` — second follow-up
- `getFollowUp3Body()` — final follow-up (break-up email)

### Step 6 — Authorize & Test

1. In Apps Script, select `runColdEmailer` from the function dropdown
2. Click **Run** — authorize Gmail + Sheets permissions when prompted
3. Check **View → Logs** to see what happened
4. Check your Sheet — statuses should be updated

### Step 7 — Set Up Daily Automation

Run `setupDailyTrigger` once (select it from the dropdown and click Run).  
This creates a trigger that runs `runColdEmailer` every day at 11 PM.

---

## Status Values

| Status | Meaning |
|--------|---------|
| *(blank)* | Not yet contacted — will send initial email |
| `sent` | Initial email sent |
| `followed_up_1` | First follow-up sent |
| `followed_up_2` | Second follow-up sent |
| `followed_up_3` | Third follow-up sent |
| `replied` | Reply detected — no more emails |
| `dead` | Max follow-ups reached, no reply |
| `skip` | Manually marked to skip this lead |
| `bounced` | Email bounced (delivery failed) |

---

## Gmail Quota

| Account Type | Emails/Day |
|---|---|
| Free Gmail | 100 per day |
| Google Workspace | 1,500 per day |

---

## Files

| File | Purpose |
|------|---------|
| `Config.gs` | All settings — sheet ID, intervals, subjects, tracking toggles |
| `EmailTemplates.gs` | Email body templates for all 4 emails |
| `Code.gs` | Core logic — send, reply check, follow-up, triggers |
| `Tracking.gs` | Apps Script webhook receiver for tracking events + bounce detection |
| `cloudflare-worker/` | Public tracking endpoints for opens/clicks with real HTTP redirects |

---

## Troubleshooting

### Tracking not working?

**Check the webhook URL format:**
- Apps Script Web App URL must end with `/exec`
- Wrong: `https://script.googleusercontent.com/...` (content URL)
- Right: `https://script.google.com/a/macros/.../exec` (web app URL)

**Check Worker logs:**
```bash
cd cloudflare-worker
npx wrangler tail
```

**Common errors:**
- `401` — Web App URL is wrong or deployment deleted
- `405` — URL is a content URL, not web app URL
- `Missing worker secrets` — `.dev.vars` not uploaded to Cloudflare

**Verify tracking flow:**
1. Check column O (TRACKING_IDS) has values like `["abc123..."]`
2. Open pixel URL directly: `https://your-worker.workers.dev/open?id=TRACKING_ID`
3. Check Apps Script Executions tab for `doPost` calls
4. Check column J (OPENED) incremented to `1`

### Gmail blocking tracking pixel?

Gmail blocks external images by default. Recipients need to click **"Load images"** or **"Always display images from this sender"** for open tracking to work. This is expected behavior — not all opens will be tracked.

### Click tracking opens wrong page?

If tracked links show a blank page instead of redirecting, the Worker is working but Gmail's iframe sandbox is interfering. The current implementation uses a simple redirect that should work in most cases. If issues persist, open the link in a new tab.

