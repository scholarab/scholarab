/**
 * Telegram alerts for real mail arriving at the ScholarAB inbox.
 *
 * This file does not run in this repo. It is Google Apps Script, bound to the
 * Gmail account itself, and it lives here so the logic is versioned and
 * reviewable rather than existing only inside a Google editor. Setup steps are
 * at the bottom of this comment.
 *
 * WHY APPS SCRIPT AND NOT A WORKER
 * The mailbox is the thing being watched, so the check belongs next to the
 * mailbox. A Cloudflare email worker would only see mail routed through the
 * domain, and would miss anything sent to the Gmail address directly; polling
 * IMAP from a GitHub Action would need an app password stored as a repo secret
 * and would run on the Actions schedule rather than on a real one. This needs
 * no infrastructure, no secret in this repo, and no outbound credentials.
 *
 * WHY THE FILTER IS THE WHOLE JOB
 * On 2026-09-04 the inbox held eleven Instagram notifications and a DMARC
 * aggregate report for every one human email. An alert on "new mail" would
 * have been muted inside a day, which is the same as having no alert. So the
 * default query is Gmail's own Primary category, which already sorts social
 * and bulk mail elsewhere, plus an explicit deny list for the automated senders
 * that still land in Primary. Getting this wrong in the quiet direction is
 * cheap, since the mail is still in the inbox. Getting it wrong in the noisy
 * direction costs the whole feature.
 *
 * SETUP
 * 1. In Telegram, message @BotFather, send /newbot, and keep the token it
 *    gives you. Then message your new bot once so it is allowed to write to
 *    you, and open this in a browser to find your numeric chat id:
 *      https://api.telegram.org/bot<TOKEN>/getUpdates
 *    Both of these are credentials. Do not paste them into a chat, a commit,
 *    or this file.
 * 2. At script.google.com, signed in as the mailbox account, create a project
 *    and paste this file in.
 * 3. Project Settings, then Script Properties, add:
 *      TELEGRAM_TOKEN    the token from BotFather
 *      TELEGRAM_CHAT_ID  your numeric chat id
 *      GMAIL_ACCOUNT     the mailbox address, used to build thread links
 *      NOTIFY_DENY       optional, comma separated substrings to ignore
 * 4. Run notifyNewMail once by hand and approve the Gmail and external request
 *    permissions it asks for. A test message should arrive in Telegram.
 * 5. Triggers, add a time driven trigger on notifyNewMail every 5 minutes.
 */

/** Automated senders that reach Primary anyway, so the category filter misses them. */
var DEFAULT_DENY = [
  'noreply-dmarc-support@google.com',
  'mailer-daemon@',
  'no-reply@',
  'noreply@',
  'donotreply@',
];

/** Telegram rejects anything past 4096 characters, so the preview is capped well under it. */
var BODY_PREVIEW_CHARS = 400;

/**
 * One run cannot send more than this. A backlog, or a filter that turns out to
 * be too loose, should show up as a handful of messages and a note in the log
 * rather than as two hundred Telegram notifications.
 */
var MAX_PER_RUN = 10;

/** How far back a first run, or a run after a long outage, is allowed to look. */
var MAX_LOOKBACK_MS = 24 * 60 * 60 * 1000;

function notifyNewMail() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('TELEGRAM_TOKEN');
  var chatId = props.getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) {
    throw new Error('Set TELEGRAM_TOKEN and TELEGRAM_CHAT_ID in Script Properties first.');
  }

  var now = Date.now();
  var floor = now - MAX_LOOKBACK_MS;
  var since = Number(props.getProperty('LAST_CHECK_MS') || 0);
  // A first run, or one after the script has been off for a day, looks back at
  // most MAX_LOOKBACK_MS. Without the floor, enabling this on an old mailbox
  // would replay months of mail into Telegram.
  if (!since || since < floor) since = floor;

  var deny = DEFAULT_DENY.concat(
    (props.getProperty('NOTIFY_DENY') || '')
      .split(',')
      .map(function (s) { return s.trim().toLowerCase(); })
      .filter(function (s) { return s.length > 0; }),
  );

  // after: takes epoch seconds. Asking Gmail to do the date filter keeps the
  // thread list small on a busy mailbox; the per message check below is what
  // actually decides, because a thread matches on its newest message and can
  // still carry older ones.
  var query = 'in:inbox category:primary -from:me after:' + Math.floor(since / 1000);
  var threads = GmailApp.search(query, 0, 50);

  var fresh = [];
  for (var t = 0; t < threads.length; t++) {
    var messages = threads[t].getMessages();
    for (var m = 0; m < messages.length; m++) {
      var msg = messages[m];
      if (msg.getDate().getTime() <= since) continue;
      if (isDenied(msg.getFrom(), deny)) continue;
      // List-Unsubscribe is the one header every bulk sender sets and no
      // person sets. It catches newsletters that slipped into Primary without
      // needing their addresses on the deny list.
      if (msg.getHeader('List-Unsubscribe')) continue;
      fresh.push(msg);
    }
  }

  if (fresh.length === 0) {
    props.setProperty('LAST_CHECK_MS', String(now));
    return;
  }

  fresh.sort(function (a, b) { return a.getDate() - b.getDate(); });
  var skipped = Math.max(0, fresh.length - MAX_PER_RUN);
  var batch = fresh.slice(0, MAX_PER_RUN);

  // The clock only advances once every message in the batch is delivered. A
  // Telegram outage then repeats the batch on the next run instead of dropping
  // it: a duplicate notification is a much smaller failure than a silent miss.
  for (var i = 0; i < batch.length; i++) {
    sendToTelegram(token, chatId, formatMessage(batch[i], props));
  }
  if (skipped > 0) {
    sendToTelegram(token, chatId, 'Plus ' + skipped + ' more waiting in the inbox.');
  }
  props.setProperty('LAST_CHECK_MS', String(now));
}

function isDenied(from, deny) {
  var lower = String(from).toLowerCase();
  for (var i = 0; i < deny.length; i++) {
    if (lower.indexOf(deny[i]) !== -1) return true;
  }
  return false;
}

function formatMessage(msg, props) {
  var body = msg.getPlainBody().replace(/\s+/g, ' ').trim();
  if (body.length > BODY_PREVIEW_CHARS) body = body.slice(0, BODY_PREVIEW_CHARS) + '...';

  // Deliberately plain text, with no parse_mode. Telegram's Markdown would
  // need every underscore and bracket in a stranger's name, subject line or
  // signature escaped, and one unescaped character fails the whole send.
  var account = props.getProperty('GMAIL_ACCOUNT') || Session.getActiveUser().getEmail();
  var link = 'https://mail.google.com/mail/u/?authuser=' +
    encodeURIComponent(account) + '#all/' + msg.getThread().getId();

  return [
    'New mail at ' + account,
    '',
    'From: ' + msg.getFrom(),
    'Subject: ' + (msg.getSubject() || '(no subject)'),
    '',
    body,
    '',
    link,
  ].join('\n');
}

function sendToTelegram(token, chatId, text) {
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    payload: {
      chat_id: chatId,
      text: text,
      disable_web_page_preview: 'true',
    },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    // Thrown, not logged and swallowed: the throw is what stops LAST_CHECK_MS
    // from advancing past mail that was never delivered.
    throw new Error('Telegram returned ' + res.getResponseCode() + ': ' + res.getContentText());
  }
}

/**
 * Run by hand from the editor to see what the current filter would have caught
 * over the last day, without sending anything. Use this after changing the
 * query or the deny list.
 */
function previewLastDay() {
  var props = PropertiesService.getScriptProperties();
  var since = Date.now() - MAX_LOOKBACK_MS;
  var deny = DEFAULT_DENY.concat(
    (props.getProperty('NOTIFY_DENY') || '').split(',').map(function (s) { return s.trim().toLowerCase(); }),
  ).filter(function (s) { return s.length > 0; });
  var threads = GmailApp.search('in:inbox category:primary -from:me after:' + Math.floor(since / 1000), 0, 50);
  var kept = [];
  var dropped = [];
  for (var t = 0; t < threads.length; t++) {
    var messages = threads[t].getMessages();
    for (var m = 0; m < messages.length; m++) {
      var msg = messages[m];
      if (msg.getDate().getTime() <= since) continue;
      var line = msg.getDate().toISOString() + '  ' + msg.getFrom() + '  ' + msg.getSubject();
      if (isDenied(msg.getFrom(), deny) || msg.getHeader('List-Unsubscribe')) dropped.push(line);
      else kept.push(line);
    }
  }
  Logger.log('WOULD NOTIFY (' + kept.length + '):\n' + kept.join('\n'));
  Logger.log('FILTERED OUT (' + dropped.length + '):\n' + dropped.join('\n'));
}
