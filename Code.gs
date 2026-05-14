// ============================================================
// COLD EMAILER — Main Logic
// ============================================================

// STATUS FLOW:
//   (blank)         -> send initial email -> "sent"       (day 0)
//   "sent"          -> day 2, no reply    -> "followed_up_1"
//   "followed_up_1" -> day 5, no reply    -> "followed_up_2"
//   "followed_up_2" -> day 9, no reply    -> "followed_up_3"
//   "followed_up_3" -> no reply           -> "dead"
//   any status      -> reply detected     -> "replied"
//
// Col F stores a JSON array of all thread IDs: [initialThreadId, fu1ThreadId, ...]
// This makes reply detection work regardless of how many follow-ups are configured.
// SKIP statuses: "replied", "dead", "skip"

// ============================================================
// ENTRY POINT: Run this manually OR via a daily time trigger
// ============================================================

function runColdEmailer() {
  // Run bounce detection first if enabled
  if (CONFIG.ENABLE_BOUNCE_DETECTION) {
    Logger.log("Running bounce detection...");
    detectBounces();
  }

  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();

  // Row 0 is the header — skip it
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var firstName  = row[COLS.FIRST_NAME];
    var company    = row[COLS.COMPANY];
    var email      = row[COLS.EMAIL];
    var status     = row[COLS.STATUS];
    var threadIdsRaw   = row[COLS.THREAD_IDS];
    var threadIds      = [];
    if (threadIdsRaw) {
      try {
        var parsed = JSON.parse(threadIdsRaw);
        threadIds = Array.isArray(parsed) ? parsed : [String(threadIdsRaw)];
      } catch (e) {
        // Cell has a plain text thread ID from before JSON migration
        threadIds = [String(threadIdsRaw)];
      }
    }
    var lastDate       = row[COLS.LAST_EMAIL_DATE];
    var initialDate    = row[COLS.INITIAL_SEND_DATE];

    // Skip rows with no email
    if (!email) continue;

    // Skip finished leads
    if (status === "replied" || status === "dead" || status === "skip") continue;

    // --- Check for reply across all threads ---
    if (hasReceivedReply(threadIds)) {
      updateRow(sheet, i + 1, { status: "replied" });
      Logger.log("Reply detected from " + email + ". Marked as replied.");
      continue;
    }

    // --- Determine next action ---
    var sequence = statusToSequence(status);

    if (sequence === -1) {
      // Unknown status — skip to be safe
      Logger.log("Unknown status '" + status + "' for " + email + ", skipping.");
      continue;
    }

    // Initial email (sequence 0) — only send if status is blank
    if (sequence === 0 && status !== "") continue;

    // Follow-ups — check if enough days have passed since initial send
    if (sequence > 0) {
      var requiredDay = CONFIG.FOLLOWUP_DAYS[sequence - 1]; // sequence 1 -> index 0 -> day 2
      if (!initialDate || !enoughDaysPassed(initialDate, requiredDay)) {
        continue;
      }
    }

    // --- Send email ---
    var subject = buildSubject(sequence, company);
    var body    = getEmailBody(sequence, firstName, company);

    if (!body) {
      Logger.log("No template for sequence " + sequence + ", skipping " + email);
      continue;
    }

    // Generate tracking ID for this email
    var trackingId = generateTrackingId(email, sequence);

    // Apply tracking if enabled
    if (CONFIG.ENABLE_OPEN_TRACKING) {
      body = embedOpenPixel(body, trackingId);
    }
    if (CONFIG.ENABLE_CLICK_TRACKING) {
      body = rewriteLinksForTracking(body, trackingId);
    }

    try {
      var result    = sendEmail(email, subject, body, sequence);
      var newStatus = sequenceToStatus(sequence);

      // Append new thread ID to the array and save back as JSON
      if (result.threadId) threadIds.push(result.threadId);

      // Get existing tracking IDs and add new one
      var trackingIdsRaw = row[COLS.TRACKING_IDS];
      var trackingIds = [];
      if (trackingIdsRaw) {
        try {
          trackingIds = JSON.parse(trackingIdsRaw);
        } catch (e) {
          trackingIds = [];
        }
      }
      trackingIds.push(trackingId);

      updateRow(sheet, i + 1, {
        status:          newStatus,
        threadIds:       JSON.stringify(threadIds),
        trackingIds:     JSON.stringify(trackingIds),
        lastEmailDate:   new Date(),
        initialSendDate: sequence === 0 ? new Date() : undefined,
      });

      Logger.log("Sent sequence " + sequence + " to " + email + " [" + newStatus + "]" + 
        (CONFIG.ENABLE_OPEN_TRACKING || CONFIG.ENABLE_CLICK_TRACKING ? " with tracking ID: " + trackingId.substring(0, 8) + "..." : ""));

      // Respect send limits — pause briefly between sends
      Utilities.sleep(1000);

    } catch (e) {
      Logger.log("ERROR sending to " + email + ": " + e.message + " | stack: " + e.stack);
    }
  }
}

// ============================================================
// SETUP: Creates a daily trigger (run once manually)
// ============================================================

function setupDailyTrigger() {
  // Delete existing triggers to avoid duplicates
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "runColdEmailer") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("runColdEmailer")
    .timeBased()
    .everyDays(1)
    .atHour(23) // Runs at 11 PM in your timezone
    .create();

  Logger.log("Daily trigger created. runColdEmailer will run every day at 11 PM.");
}

// ============================================================
// HELPER: Send email and return the Gmail thread ID
// ============================================================

function sendEmail(toEmail, subject, htmlBody, sequence) {
  var options = {
    htmlBody: htmlBody,
    name:     CONFIG.SENDER_NAME,
  };

  GmailApp.sendEmail(toEmail, subject, "", options);

  // For initial email, find and return the new thread ID
  Utilities.sleep(1500);
  var sentThreads = GmailApp.search("to:" + toEmail + " in:sent", 0, 1);
  if (sentThreads.length > 0) {
    return { threadId: sentThreads[0].getId() };
  }
  return { threadId: "" };
}

// ============================================================
// HELPER: Check if a thread has a reply (messages > 1)
// ============================================================

function hasReceivedReply(threadIds) {
  try {
    if (!threadIds || threadIds.length === 0) return false;
    for (var i = 0; i < threadIds.length; i++) {
      var threadId = threadIds[i];
      var thread = GmailApp.getThreadById(threadId);
      if (!thread) return false;

      var messages = thread.getMessages();
      if (messages.length <= 1) continue;

      // Make sure at least one message is NOT from us (i.e., it's a reply)
      var myEmail = Session.getActiveUser().getEmail();
      for (var j = 1; j < messages.length; j++) {
        var from = messages[j].getFrom();
        if (from.indexOf(myEmail) === -1) {
          return true;
        }
      }
    }
    return false;
  } catch (e) {
    Logger.log("Could not check thread " + threadIds + ": " + e.message);
    return false;
  }
}

// ============================================================
// HELPER: Days since a given date
// ============================================================

function enoughDaysPassed(lastDate, days) {
  var now      = new Date();
  var last     = new Date(lastDate);
  var diffMs   = now - last;
  var diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= days;
}

// ============================================================
// HELPER: Map status string -> sequence number
//   0 = initial (blank status)
//   1 = first follow-up
//   2 = second follow-up
//   3 = third follow-up
// ============================================================

function statusToSequence(status) {
  switch (status) {
    case "":              return 0;
    case "sent":          return 1;
    case "followed_up_1": return 2;
    case "followed_up_2": return 3;
    case "followed_up_3": return -1; // No more follow-ups — mark dead
    default:              return -1;
  }
}

function sequenceToStatus(sequence) {
  switch (sequence) {
    case 0: return "sent";
    case 1: return "followed_up_1";
    case 2: return "followed_up_2";
    case 3: return "followed_up_3";
    default: return "dead";
  }
}

// ============================================================
// HELPER: Build subject line with company name
// ============================================================

function buildSubject(sequence, company) {
  var template = sequence === 0 ? CONFIG.INITIAL_SUBJECT : CONFIG.FOLLOWUP_SUBJECT;
  return template.replace(/\{\{company\}\}/g, company);
}

// ============================================================
// HELPER: Get the leads sheet
// ============================================================

function getSheet() {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  return ss.getSheetByName(CONFIG.SHEET_NAME);
}

// ============================================================
// HELPER: Update specific cells in a row
// ============================================================

function updateRow(sheet, rowNumber, updates) {
  if (updates.status !== undefined) {
    sheet.getRange(rowNumber, COLS.STATUS + 1).setValue(updates.status);
  }
  if (updates.threadIds !== undefined) {
    sheet.getRange(rowNumber, COLS.THREAD_IDS + 1).setValue(updates.threadIds);
  }
  if (updates.lastEmailDate !== undefined) {
    sheet.getRange(rowNumber, COLS.LAST_EMAIL_DATE + 1).setValue(updates.lastEmailDate);
  }
  if (updates.initialSendDate !== undefined) {
    sheet.getRange(rowNumber, COLS.INITIAL_SEND_DATE + 1).setValue(updates.initialSendDate);
  }
  if (updates.trackingIds !== undefined) {
    sheet.getRange(rowNumber, COLS.TRACKING_IDS + 1).setValue(updates.trackingIds);
  }
}

// ============================================================
// UTILITY: Reset a lead's status (run manually if needed)
// ============================================================

function resetLead() {
  // Change the email below and run this function to reset a single lead
  var targetEmail = "lead@example.com";
  var sheet = getSheet();
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][COLS.EMAIL] === targetEmail) {
      sheet.getRange(i + 1, COLS.STATUS + 1).setValue("");
      sheet.getRange(i + 1, COLS.THREAD_IDS + 1).setValue("[]");
      sheet.getRange(i + 1, COLS.LAST_EMAIL_DATE + 1).setValue("");
      sheet.getRange(i + 1, COLS.INITIAL_SEND_DATE + 1).setValue("");
      Logger.log("Reset lead: " + targetEmail);
      return;
    }
  }
  Logger.log("Lead not found: " + targetEmail);
}
