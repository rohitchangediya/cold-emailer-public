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

  // Max emails to send in a single script execution (optional)
  // Useful when runColdEmailer is triggered multiple times per day.
  MAX_EMAILS_PER_RUN: 25,

  // Max emails to send per day (optional)
  // Tracked via Script Properties as sent_count_YYYY-MM-DD.
  DAILY_SEND_BUDGET: 100,

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

  // Skip sending on weekends (Saturday = 6, Sunday = 0)
  SKIP_WEEKENDS: true,

  // Duplicate email detection - skip leads with duplicate emails
  SKIP_DUPLICATE_EMAILS: true,

  // Unsubscribe link in emails
  ENABLE_UNSUBSCRIBE: true,
  UNSUBSCRIBE_URL: "https://your-worker.your-subdomain.workers.dev/unsubscribe",

  // Webhook for replied leads (optional)
  REPLIED_WEBHOOK_URL: "",  // e.g., "https://hooks.zapier.com/hooks/catch/..."

  // Reply sentiment analysis - categorize replies as positive/negative/neutral
  // and send different follow-up sequences
  ENABLE_SENTIMENT_ANALYSIS: true,
  POSITIVE_KEYWORDS: ["interested", "yes", "sure", "okay", "sounds good", "let's talk", "book a call", "schedule", "meeting"],
  NEGATIVE_KEYWORDS: ["not interested", "unsubscribe", "remove", "stop", "no thanks", "don't contact", "spam"],
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
  UNSUBSCRIBED:        17,  // R  — Unsubscribe status (true/false)
  REPLY_SENTIMENT:     18,  // S  — positive | negative | neutral
  LAST_REPLY_TEXT:     19,  // T  — Content of the last reply received
};
