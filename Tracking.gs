// ============================================================
// TRACKING — Open tracking, click tracking, and bounce detection
// ============================================================

// Apps Script webhook receiver for tracking events sent by the Cloudflare Worker
// Deploy as web app with "Execute as me" and "Anyone" access
function doGet(e) {
  return ContentService.createTextOutput(
    'Tracking webhook is running. Send POST requests from the Cloudflare Worker.'
  );
}

function doPost(e) {
  try {
    var payload = parseTrackingPayload_(e);

    if (!payload || !payload.secret || payload.secret !== CONFIG.TRACKING_WEBHOOK_SECRET) {
      return jsonResponse_({ ok: false, error: 'unauthorized' });
    }

    if (!payload.type) {
      return jsonResponse_({ ok: false, error: 'missing_fields' });
    }

    if (payload.type === 'open' && payload.trackingId) {
      logOpen(payload.trackingId);
      return jsonResponse_({ ok: true, type: 'open' });
    }

    if (payload.type === 'click' && payload.trackingId) {
      logClick(payload.trackingId, payload.url || '');
      return jsonResponse_({ ok: true, type: 'click' });
    }

    if (payload.type === 'unsubscribe' && payload.email) {
      logUnsubscribe(payload.email);
      return jsonResponse_({ ok: true, type: 'unsubscribe' });
    }

    return jsonResponse_({ ok: false, error: 'invalid_type' });
  } catch (e) {
    Logger.log('Error in tracking webhook: ' + e.message);
    return jsonResponse_({ ok: false, error: 'server_error', message: e.message });
  }
}

// Generate a unique tracking ID for each email
function generateTrackingId(email, sequence) {
  var timestamp = new Date().getTime();
  var random = Math.floor(Math.random() * 10000);
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, email + sequence + timestamp + random)
    .map(function(byte) { return (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0'); })
    .join('');
}

// Get the public tracking base URL (Cloudflare Worker)
function getTrackingBaseUrl() {
  return (CONFIG.TRACKING_BASE_URL || 'https://your-worker.your-subdomain.workers.dev').replace(/\/$/, '');
}

// Embed open tracking pixel in email body
function embedOpenPixel(body, trackingId) {
  var pixelUrl = getTrackingBaseUrl() + '/open?id=' + trackingId;
  var pixel = '<img src="' + pixelUrl + '" width="1" height="1" alt="" style="display:block;width:1px;height:1px;visibility:hidden;" />';
  
  Logger.log('Embedding tracking pixel with URL: ' + pixelUrl.substring(0, 60) + '...');
  
  // Try to append before </body> if it exists, otherwise append at the very end
  if (body.indexOf('</body>') !== -1) {
    return body.replace('</body>', pixel + '</body>');
  } else if (body.indexOf('</html>') !== -1) {
    return body.replace('</html>', pixel + '</html>');
  } else {
    // No closing tags, just append at the end
    return body + pixel;
  }
}

// Rewrite links in email body for click tracking
function rewriteLinksForTracking(body, trackingId) {
  var linkRegex = /<a\b([^>]*?)href=["'](https?:\/\/[^"']+)["']([^>]*)>/gi;

  return body.replace(linkRegex, function(match, beforeHref, url, afterHref) {
    var encodedUrl = encodeURIComponent(url);
    var trackingUrl = getTrackingBaseUrl() + '/click?id=' + trackingId + '&url=' + encodedUrl;
    var attributes = (beforeHref || '') + (afterHref || '');
    var targetAttr = /\btarget\s*=/i.test(attributes) ? '' : ' target="_blank"';
    var relAttr = /\brel\s*=/i.test(attributes) ? '' : ' rel="noopener noreferrer"';
    return '<a' + (beforeHref || '') + 'href="' + trackingUrl + '"' + (afterHref || '') + targetAttr + relAttr + '>';
  });
}

// Log email open event
function logOpen(trackingId) {
  try {
    var sheet = getSheet();
    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      var trackingIdsRaw = data[i][COLS.TRACKING_IDS];
      if (trackingIdsRaw && trackingIdsRaw.indexOf(trackingId) !== -1) {
        // Found the lead — update open tracking column
        var currentOpens = data[i][COLS.OPENED] || '';
        var openCount = parseInt(currentOpens) || 0;
        sheet.getRange(i + 1, COLS.OPENED + 1).setValue(openCount + 1);
        sheet.getRange(i + 1, COLS.LAST_OPENED + 1).setValue(new Date());
        Logger.log('Open tracked for: ' + data[i][COLS.EMAIL]);
        break;
      }
    }
  } catch (e) {
    Logger.log('Error logging open: ' + e.message);
  }
}

// Log link click event
function logClick(trackingId, url) {
  try {
    var sheet = getSheet();
    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      var trackingIdsRaw = data[i][COLS.TRACKING_IDS];
      if (trackingIdsRaw && trackingIdsRaw.indexOf(trackingId) !== -1) {
        // Found the lead — update click tracking column
        var currentClicks = data[i][COLS.CLICKED] || '';
        var clickCount = parseInt(currentClicks) || 0;
        sheet.getRange(i + 1, COLS.CLICKED + 1).setValue(clickCount + 1);
        sheet.getRange(i + 1, COLS.LAST_CLICKED + 1).setValue(new Date());
        sheet.getRange(i + 1, COLS.CLICKED_LINKS + 1).setValue(
          (data[i][COLS.CLICKED_LINKS] || '') + url + '\n'
        );
        Logger.log('Click tracked for: ' + data[i][COLS.EMAIL] + ' to ' + url);
        break;
      }
    }
  } catch (e) {
    Logger.log('Error logging click: ' + e.message);
  }
}

// Log unsubscribe event
function logUnsubscribe(email) {
  try {
    var sheet = getSheet();
    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][COLS.EMAIL] === email) {
        sheet.getRange(i + 1, COLS.UNSUBSCRIBED + 1).setValue(true);
        sheet.getRange(i + 1, COLS.STATUS + 1).setValue('dead');
        Logger.log('Unsubscribe tracked for: ' + email);
        break;
      }
    }
  } catch (e) {
    Logger.log('Error logging unsubscribe: ' + e.message);
  }
}

function parseTrackingPayload_(e) {
  if (!e || !e.postData || !e.postData.contents) return null;
  return JSON.parse(e.postData.contents);
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// BOUNCE DETECTION — Scan Gmail for delivery failures
// ============================================================

function detectBounces() {
  try {
    // Search for bounce messages in the last 24 hours
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var searchQuery = 'in:inbox (subject:"Delivery Status Notification" OR subject:"Undeliverable" OR subject:"Mail Delivery Failed" OR subject:"Message not delivered") after:' + Utilities.formatDate(yesterday, Session.getScriptTimeZone(), 'yyyy/MM/dd');
    
    var threads = GmailApp.search(searchQuery, 0, 50);
    Logger.log('Found ' + threads.length + ' potential bounce messages');
    
    var sheet = getSheet();
    var data = sheet.getDataRange().getValues();
    var bouncedEmails = [];
    
    for (var i = 0; i < threads.length; i++) {
      var messages = threads[i].getMessages();
      for (var j = 0; j < messages.length; j++) {
        var body = messages[j].getPlainBody();
        var subject = messages[j].getSubject();
        
        // Extract the original recipient email from bounce message
        var failedEmail = extractFailedEmailFromBounce(body, subject);
        
        if (failedEmail) {
          bouncedEmails.push({
            email: failedEmail,
            reason: extractBounceReason(body),
            date: messages[j].getDate()
          });
        }
      }
    }
    
    // Update sheet with bounce info
    var updatedCount = 0;
    for (var k = 0; k < bouncedEmails.length; k++) {
      for (var i = 1; i < data.length; i++) {
        var leadEmail = data[i][COLS.EMAIL];
        if (leadEmail === bouncedEmails[k].email) {
          var currentStatus = data[i][COLS.STATUS];
          if (currentStatus !== 'bounced' && currentStatus !== 'invalid') {
            sheet.getRange(i + 1, COLS.STATUS + 1).setValue('bounced');
            sheet.getRange(i + 1, COLS.BOUNCE_REASON + 1).setValue(bouncedEmails[k].reason);
            sheet.getRange(i + 1, COLS.BOUNCE_DATE + 1).setValue(bouncedEmails[k].date);
            Logger.log('Marked as bounced: ' + leadEmail + ' - ' + bouncedEmails[k].reason);
            updatedCount++;
          }
          break;
        }
      }
    }
    
    Logger.log('Total bounces detected and updated: ' + updatedCount);
    return updatedCount;
    
  } catch (e) {
    Logger.log('Error detecting bounces: ' + e.message);
    return 0;
  }
}

// Extract the failed email address from bounce message
function extractFailedEmailFromBounce(body, subject) {
  var patterns = [
    /Original-Recipient:\s*rfc822;\s*([^\s]+)/i,
    /Final-Recipient:\s*rfc822;\s*([^\s]+)/i,
    /Failed recipient:\s*([^\s]+@[^\s]+)/i,
    /[<\s]([^\s]+@[^\s]+)[>\s]/g,
    /to\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
  ];
  
  for (var i = 0; i < patterns.length; i++) {
    var matches = body.match(patterns[i]);
    if (matches) {
      var email = matches[1] || matches[0];
      email = email.replace(/[<>\s]/g, '');
      if (email.indexOf('@') !== -1) {
        return email.toLowerCase();
      }
    }
  }
  
  // Try to find any email in the subject line
  var subjectMatches = subject.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (subjectMatches) {
    return subjectMatches[1].toLowerCase();
  }
  
  return null;
}

// Extract bounce reason from message
function extractBounceReason(body) {
  var reasons = [
    { pattern: /550|5\.1\.1|user unknown|recipient not found/i, reason: 'User not found' },
    { pattern: /5\.1\.2|domain not found|bad destination|invalid domain/i, reason: 'Invalid domain' },
    { pattern: /mailbox full|quota exceeded|over quota/i, reason: 'Mailbox full' },
    { pattern: /spam|blocked|blacklisted|rejected/i, reason: 'Blocked/Spam' },
    { pattern: /5\.7\.1|access denied|not authorized/i, reason: 'Access denied' }
  ];
  
  for (var i = 0; i < reasons.length; i++) {
    if (reasons[i].pattern.test(body)) {
      return reasons[i].reason;
    }
  }
  
  return 'Unknown bounce reason';
}

// Run bounce detection (add this to runColdEmailer or run separately)
function runBounceCheck() {
  var count = detectBounces();
  Logger.log('Bounce check complete. Updated ' + count + ' leads.');
}

// ============================================================
// DEBUG: Test tracking functionality
// ============================================================

function testTracking() {
  // Get a lead from the sheet and manually trigger an open event
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    var trackingIdsRaw = data[i][COLS.TRACKING_IDS];
    if (trackingIdsRaw) {
      try {
        var trackingIds = JSON.parse(trackingIdsRaw);
        if (trackingIds.length > 0) {
          var testId = trackingIds[0];
          Logger.log('Testing with tracking ID: ' + testId);
          Logger.log('Simulating open event...');
          logOpen(testId);
          Logger.log('Check column J (OPENED) for row ' + (i + 1) + ' - it should now show a number');
          return;
        }
      } catch (e) {
        Logger.log('Error parsing tracking IDs for row ' + (i + 1) + ': ' + e.message);
      }
    }
  }
  
  Logger.log('No leads with tracking IDs found. Send an email first.');
}

// Test the web app URL is configured correctly
function testWebAppConfig() {
  var url = getTrackingBaseUrl();
  Logger.log('Tracking base URL configured: ' + url);

  if (url.indexOf('your-worker.your-subdomain.workers.dev') !== -1) {
    Logger.log('WARNING: Tracking base URL may not be configured correctly!');
    Logger.log('Please deploy the Cloudflare Worker and update CONFIG.TRACKING_BASE_URL');
  } else {
    Logger.log('Tracking base URL looks correct.');
  }
}
