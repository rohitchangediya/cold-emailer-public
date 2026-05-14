// ============================================================
// CONFIG — Edit these values before running
// ============================================================

var CONFIG = {
  // Google Sheet ID (found in the Sheet URL between /d/ and /edit)
  SHEET_ID: "YOUR_GOOGLE_SHEET_ID_HERE",

  // Name of the sheet tab containing leads
  SHEET_NAME: "Leads",

  // Your name shown as the email sender
  SENDER_NAME: "Your Name",

  // Days since initial email to send each follow-up
  FOLLOWUP_DAYS: [2, 5, 9],  // FU1 on day 2, FU2 on day 5, FU3 on day 9

  // Maximum number of follow-ups to send (after initial email)
  MAX_FOLLOWUPS: 3,

  // Subject line for the initial cold email
  INITIAL_SUBJECT: "Quick question for {{company}}",

  // Subject line for follow-ups (Re: keeps it in the same thread visually)
  FOLLOWUP_SUBJECT: "Re: Quick question for {{company}}",

  // Public tracking base URL (Cloudflare Worker)
  TRACKING_BASE_URL: "https://your-worker.your-subdomain.workers.dev",

  // Shared secret used by the Worker when posting events back to Apps Script
  TRACKING_WEBHOOK_SECRET: "replace-with-a-long-random-secret",

  // Enable tracking features
  ENABLE_OPEN_TRACKING: true,
  ENABLE_CLICK_TRACKING: true,
  ENABLE_BOUNCE_DETECTION: true,
};

// ============================================================
// SHEET COLUMN INDICES (0-based)
// Match these to your Google Sheet column order
// ============================================================

var COLS = {
  FIRST_NAME:      0,  // A
  LAST_NAME:       1,  // B
  COMPANY:         2,  // C
  EMAIL:           3,  // D
  STATUS:          4,  // E  — sent | followed_up_1 | followed_up_2 | followed_up_3 | replied | dead | bounced
  THREAD_IDS:        5,  // F  — JSON array of all thread IDs [initial, fu1, fu2, ...] (auto-filled)
  LAST_EMAIL_DATE:    6,  // G  — Date of last email sent (auto-filled)
  INITIAL_SEND_DATE:  7,  // H  — Date of the very first email (auto-filled)
  NOTES:              8,  // I  — Optional notes

  // TRACKING COLUMNS
  OPENED:             9,  // J  — Number of times email was opened
  LAST_OPENED:         10,  // K  — Date of last open
  CLICKED:            11,  // L  — Number of times links were clicked
  LAST_CLICKED:        12,  // M  — Date of last click
  CLICKED_LINKS:       13,  // N  — URLs that were clicked (newline separated)
  TRACKING_IDS:        14,  // O  — JSON array of tracking IDs per email
  BOUNCE_REASON:       15,  // P  — Why the email bounced (if applicable)
  BOUNCE_DATE:         16,  // Q  — Date bounce was detected
};
