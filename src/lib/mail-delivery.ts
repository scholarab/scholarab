/** Shared by the Worker and scheduled sender. SQL is parameterized and each
 * claim is atomic. No email provider calls are made until both claims succeed. */
export type MailQuery = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
export type MailPayload = {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  html: string;
  headers: Record<string, string>;
};
export async function mailKey(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}
export async function claimRecipient(query: MailQuery, email: string): Promise<boolean> {
  const rows = await query(
    `INSERT INTO confirmation_recipients (key,claimed_at,window_start,attempts)
    VALUES ($1,now(),now(),1) ON CONFLICT (key) DO UPDATE SET claimed_at=now(),
    window_start=CASE WHEN confirmation_recipients.window_start <= now()-interval '24 hours' THEN now() ELSE confirmation_recipients.window_start END,
    attempts=CASE WHEN confirmation_recipients.window_start <= now()-interval '24 hours' THEN 1 ELSE confirmation_recipients.attempts+1 END
    WHERE confirmation_recipients.claimed_at <= now()-interval '15 minutes'
      AND (confirmation_recipients.window_start <= now()-interval '24 hours' OR confirmation_recipients.attempts < 5)
    RETURNING key`,
    [await mailKey(email.trim().toLowerCase())]
  );
  return rows.length === 1;
}
/** Payload is retained only while unsettled, so retries send exactly the same
 * bytes with the same key. Resend retains idempotency keys for 24h; ambiguous
 * outcomes older than 23h require operator reconciliation, never a blind resend.
 * https://resend.com/docs/dashboard/emails/idempotency-keys */
export async function deliverMail(
  query: MailQuery,
  key: string,
  subscriptionId: number,
  kind: 'confirm' | 'reminder',
  payload: MailPayload,
  apiKey: string,
  send: typeof fetch = fetch
): Promise<'sent' | 'skipped'> {
  const rows = await query(
    `INSERT INTO mail_deliveries (key,subscription_id,kind,state,payload)
    SELECT $1,$2,$3,'pending',$4::jsonb WHERE EXISTS (SELECT 1 FROM subscribers WHERE id=$2)
    ON CONFLICT (key) DO UPDATE SET state='pending',updated_at=now()
    WHERE mail_deliveries.state <> 'sent'
      AND mail_deliveries.updated_at < now()-interval '2 minutes'
      AND mail_deliveries.created_at > now()-interval '23 hours'
    RETURNING payload`,
    [key, subscriptionId, kind, JSON.stringify(payload)]
  );
  if (!rows.length) return 'skipped';
  try {
    const response = await send('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify(rows[0]!.payload),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
    await query(
      `UPDATE mail_deliveries SET state='sent',payload=NULL,updated_at=now() WHERE key=$1`,
      [key]
    );
    return 'sent';
  } catch (e) {
    await query(
      `UPDATE mail_deliveries SET state='uncertain',updated_at=now() WHERE key=$1 AND state <> 'sent'`,
      [key]
    ).catch(() => {});
    throw e;
  }
}
