import "server-only";
import { randomBytes } from "node:crypto";
import { renderNewsletter, sanitizeNewsletter, type NewsletterContent } from "@/lib/email/newsletter";
import { audit } from "./audit";
import { ValidationError } from "./catalogue";
import type { Db } from "./db";
import { BATCH_SIZE, bulkEmailReady, sendEmail, sendEmailBatch } from "./notify";
import { waitlistSummary } from "./waitlist";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);

export interface Subscriber {
  id: number;
  email: string;
  name: string;
  token: string;
  source: string;
  consent_at: Date;
  unsubscribed_at: Date | null;
  created_at: Date;
}

/**
 * Public sign-up for the weekly email. Needs a ticked consent box. Signing up again
 * after unsubscribing re-subscribes (with fresh consent). The same answer is given
 * whether or not the email was already on the list, so it reveals nothing.
 */
export async function subscribe(db: Db, input: Record<string, unknown>, source = "website") {
  const email = clean(input.email, 160).toLowerCase();
  const name = clean(input.name, 60);
  if (!EMAIL_RE.test(email)) throw new ValidationError("Please enter a valid email address.");
  if (input.consent !== true) throw new ValidationError("Please tick the box so we're allowed to email you.");
  await db.query(
    `insert into mailing_list (email, name, token, source) values ($1, $2, $3, $4)
     on conflict (lower(email)) do update
       set unsubscribed_at = null, consent_at = now(),
           name = case when excluded.name <> '' then excluded.name else mailing_list.name end`,
    [email, name, randomBytes(24).toString("base64url"), source],
  );
  return { ok: true as const };
}

/** One-click unsubscribe from the link in every email. Unknown tokens are ignored quietly. */
export async function unsubscribe(db: Db, token: unknown) {
  const t = clean(token, 100);
  if (!t) return { ok: false as const };
  const rows = await db.query<{ id: number }>(
    "update mailing_list set unsubscribed_at = coalesce(unsubscribed_at, now()) where token = $1 returning id",
    [t],
  );
  return { ok: rows.length > 0 };
}

export async function listSubscribers(db: Db) {
  return db.query<Subscriber>("select * from mailing_list order by unsubscribed_at nulls first, created_at desc");
}

export async function removeSubscriber(db: Db, actor: string, id: number) {
  await db.query("delete from mailing_list where id = $1", [id]);
  await audit(db, actor, "mailing.remove", "subscriber", id);
}

export interface CampaignRow {
  id: number;
  status: "draft" | "sent";
  subject: string;
  content: NewsletterContent;
  recipients: number;
  failed: number;
  sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function getDraft(db: Db): Promise<CampaignRow | null> {
  const [row] = await db.query<CampaignRow>("select * from mailing_campaigns where status = 'draft' order by updated_at desc limit 1");
  return row ?? null;
}

export async function saveDraft(db: Db, actor: string, raw: unknown) {
  const content = sanitizeNewsletter(raw);
  const draft = await getDraft(db);
  if (draft) {
    await db.query("update mailing_campaigns set content = $2::jsonb, subject = $3, updated_at = now() where id = $1", [
      draft.id,
      JSON.stringify(content),
      content.subject,
    ]);
    return draft.id;
  }
  const [row] = await db.query<{ id: number }>(
    "insert into mailing_campaigns (status, subject, content, created_by) values ('draft', $1, $2::jsonb, $3) returning id",
    [content.subject, JSON.stringify(content), actor],
  );
  return row.id;
}

export async function sentCampaigns(db: Db) {
  return db.query<CampaignRow>("select * from mailing_campaigns where status = 'sent' order by sent_at desc limit 50");
}

async function nextIssueNumber(db: Db) {
  const [r] = await db.query<{ n: number }>("select count(*)::int as n from mailing_campaigns where status = 'sent'");
  return r.n + 1;
}

function validateForSend(c: NewsletterContent) {
  if (!c.subject) throw new ValidationError("Add a subject line.");
  if (!c.headline && !c.intro && !c.sections.some((s) => s.body)) throw new ValidationError("The email is empty. Add a headline, intro or section.");
  if (c.ctaLabel && !c.ctaUrl) throw new ValidationError("Add a link for the button, or clear the button text.");
}

/** The context a rendered email needs (live waitlist numbers, issue number). */
export async function renderContext(db: Db, siteUrl: string) {
  const wl = await waitlistSummary(db);
  return {
    siteUrl,
    issueNumber: await nextIssueNumber(db),
    date: new Date(),
    waitlist: { spots: wl.spots, left: wl.left, open: wl.open },
  };
}

export const unsubscribeUrl = (siteUrl: string, token: string) => `${siteUrl}/unsubscribe?t=${encodeURIComponent(token)}`;

/** Send one copy to the owner first, to check how it looks in a real inbox. */
export async function sendTestCampaign(db: Db, raw: unknown, to: string, siteUrl: string) {
  const content = sanitizeNewsletter(raw);
  validateForSend(content);
  const ctx = await renderContext(db, siteUrl);
  const m = renderNewsletter(content, { ...ctx, unsubscribeUrl: `${siteUrl}/unsubscribe`, name: "" });
  return sendEmail({ to, subject: `[Test] ${m.subject}`, html: m.html, text: m.text });
}

/**
 * Send the email to every active subscriber, each with their own unsubscribe link,
 * in batches of 100. The draft becomes a sent issue with its counts recorded.
 */
export async function sendCampaign(db: Db, actor: string, raw: unknown, siteUrl: string) {
  if (!bulkEmailReady()) {
    throw new ValidationError("Sending to subscribers needs RESEND_API_KEY and EMAIL_FROM (an address on your own domain verified in Resend).");
  }
  const content = sanitizeNewsletter(raw);
  validateForSend(content);
  const subs = await db.query<Subscriber>("select * from mailing_list where unsubscribed_at is null order by id");
  if (!subs.length) throw new ValidationError("There are no subscribers yet.");
  const ctx = await renderContext(db, siteUrl);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (let i = 0; i < subs.length; i += BATCH_SIZE) {
    const chunk = subs.slice(i, i + BATCH_SIZE);
    const messages = chunk.map((s) => {
      const unsub = unsubscribeUrl(siteUrl, s.token);
      const m = renderNewsletter(content, { ...ctx, unsubscribeUrl: unsub, name: s.name });
      return {
        to: s.email,
        subject: m.subject,
        html: m.html,
        text: m.text,
        headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      };
    });
    const r = await sendEmailBatch(messages);
    if (r.sent) sent += chunk.length;
    else {
      failed += chunk.length;
      errors.push(r.reason);
    }
  }

  const draft = await getDraft(db);
  const params = [content.subject, JSON.stringify(content), sent, failed];
  if (draft) {
    await db.query(
      "update mailing_campaigns set status = 'sent', subject = $2, content = $3::jsonb, recipients = $4, failed = $5, sent_at = now(), updated_at = now() where id = $1",
      [draft.id, ...params],
    );
  } else {
    await db.query(
      "insert into mailing_campaigns (status, subject, content, recipients, failed, sent_at, created_by) values ('sent', $1, $2::jsonb, $3, $4, now(), $5)",
      [...params, actor],
    );
  }
  await audit(db, actor, "mailing.send", "campaign", null, { subject: content.subject, sent, failed, issue: ctx.issueNumber });
  return { sent, failed, issue: ctx.issueNumber, error: errors[0] };
}

export async function mailingSummary(db: Db) {
  const [r] = await db.query<{ active: number; unsubscribed: number }>(
    "select count(*) filter (where unsubscribed_at is null)::int as active, count(*) filter (where unsubscribed_at is not null)::int as unsubscribed from mailing_list",
  );
  const [last] = await db.query<{ sent_at: Date }>("select sent_at from mailing_campaigns where status = 'sent' order by sent_at desc limit 1");
  const daysSinceLast = last ? Math.floor((Date.now() - new Date(last.sent_at).getTime()) / 86_400_000) : null;
  return { active: r.active, unsubscribed: r.unsubscribed, lastSentAt: last?.sent_at ?? null, daysSinceLast };
}
