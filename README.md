# Cold Emailer — Google Apps Script

Automated cold email system with follow-ups and reply detection, built on Google Apps Script + Google Sheets.

---

## Features

- Sends personalized cold emails using `{{firstName}}` and `{{company}}` placeholders
- Auto follow-up 3 times (3 days apart) if no reply
- Detects replies via Gmail thread — stops follow-ups automatically
- All leads and statuses tracked in Google Sheets
- Daily time-based trigger for fully automated runs

---

## Setup

### Step 1 — Create the Google Sheet

Create a new Google Sheet with the following columns **in order**:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| firstName | lastName | company | email | status | threadIds | lastEmailDate | initialSendDate | notes |

- Row 1 should be the **header row** (exact names don't matter, just the order)
- Add your leads starting from **Row 2**
- Leave all columns from E onward blank — the script fills them automatically

### Step 2 — Create the Apps Script Project

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Delete the default `Code.gs` content
4. Create three files and paste the contents:
   - `Config.gs` → paste `Config.gs`
   - `EmailTemplates.gs` → paste `EmailTemplates.gs`
   - `Code.gs` → paste `Code.gs`

### Step 3 — Configure

In `Config.gs`, update:

```javascript
SHEET_ID: "YOUR_GOOGLE_SHEET_ID_HERE",  // From the Sheet URL
SENDER_NAME: "Your Name",
INITIAL_SUBJECT: "Quick question for {{company}}",
```

Get your Sheet ID from the URL:
```
https://docs.google.com/spreadsheets/d/THIS_IS_YOUR_SHEET_ID/edit
```

### Step 4 — Customize Email Templates

Edit `EmailTemplates.gs` to write your actual email copy:
- `getInitialEmailBody()` — your cold email
- `getFollowUp1Body()` — first follow-up
- `getFollowUp2Body()` — second follow-up
- `getFollowUp3Body()` — final follow-up (break-up email)

### Step 5 — Authorize & Test

1. In Apps Script, select `runColdEmailer` from the function dropdown
2. Click **Run** — authorize Gmail + Sheets permissions when prompted
3. Check **View → Logs** to see what happened
4. Check your Sheet — statuses should be updated

### Step 6 — Set Up Daily Automation

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

---

## Gmail Quota

| Account Type | Emails/Day |
|---|---|
| Free Gmail | 100 |
| Google Workspace | 1,500 |

---

## Files

| File | Purpose |
|------|---------|
| `Config.gs` | All settings — sheet ID, intervals, subjects |
| `EmailTemplates.gs` | Email body templates for all 4 emails |
| `Code.gs` | Core logic — send, reply check, follow-up, triggers |
