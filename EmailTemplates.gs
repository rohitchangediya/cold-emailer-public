// ============================================================
// EMAIL TEMPLATES
// Use {{firstName}} and {{company}} as placeholders
// ============================================================

function getInitialEmailBody(firstName, company) {
  return `
<p>Hey {{firstName}},</p>

<p>I came across {{company}} and wanted to reach out directly.</p>

<p>We've built a tool that helps teams cut down on manual work and streamline day-to-day operations — the kind of overhead that quietly eats into time and resources as a business scales.</p>

<p>A few things it helps with:</p>
<ul>
  <li>Centralizing workflows that are currently spread across tools or spreadsheets</li>
  <li>Automating repetitive tasks so your team can focus on higher-value work</li>
  <li>Improving visibility across teams with real-time reporting and dashboards</li>
  <li>Reducing back-and-forth with clients or internal stakeholders</li>
</ul>

<p>The goal is to make your operations run more smoothly without adding complexity.</p>

<p>Would love to show you a quick demo and see if it's a fit for what {{company}} is working on.</p>

<p>Best,<br>
${CONFIG.SENDER_NAME}</p>
`
  .replace(/\{\{firstName\}\}/g, firstName)
  .replace(/\{\{company\}\}/g, company);
}

function getFollowUp1Body(firstName, company) {
  return `
<p>Hi {{firstName}},</p>

<p>Just following up on my last note in case it got buried.</p>

<p>I think there's a real opportunity to simplify some of the operational overhead at {{company}} — whether it's cutting down on manual processes, improving team visibility, or reducing time spent on coordination.</p>

<p>Would you have 15 minutes this week for a quick walkthrough?</p>

<p>Best,<br>
${CONFIG.SENDER_NAME}</p>
`
  .replace(/\{\{firstName\}\}/g, firstName)
  .replace(/\{\{company\}\}/g, company);
}

function getFollowUp2Body(firstName, company) {
  return `
<p>Hi {{firstName}},</p>

<p>I know things get busy — just wanted to check in one more time.</p>

<p>If you're currently evaluating options or just haven't had the bandwidth, no worries at all. I'm happy to send over a brief overview of how we've helped similar teams — no call needed.</p>

<p>Just say the word and I'll get it over to you.</p>

<p>Best,<br>
${CONFIG.SENDER_NAME}</p>
`
  .replace(/\{\{firstName\}\}/g, firstName)
  .replace(/\{\{company\}\}/g, company);
}

function getFollowUp3Body(firstName, company) {
  return `
<p>Hi {{firstName}},</p>

<p>I'll make this my last follow-up so I'm not cluttering your inbox.</p>

<p>If the timing isn't right at the moment, no problem at all. Should {{company}}'s needs shift down the road, feel free to reach back out — I'd be happy to reconnect.</p>

<p>Wishing you and the team all the best.</p>

<p>Best,<br>
${CONFIG.SENDER_NAME}</p>
`
  .replace(/\{\{firstName\}\}/g, firstName)
  .replace(/\{\{company\}\}/g, company);
}

// Returns the correct body function based on follow-up sequence number
function getEmailBody(sequenceNumber, firstName, company) {
  switch (sequenceNumber) {
    case 0: return getInitialEmailBody(firstName, company);
    case 1: return getFollowUp1Body(firstName, company);
    case 2: return getFollowUp2Body(firstName, company);
    case 3: return getFollowUp3Body(firstName, company);
    default: return null;
  }
}
