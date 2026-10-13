import "server-only";
import { siteConfig } from "@/config/site";
import { formatPence } from "@/config/offer";
import { buildSummaryText, quote, sanitizeBuild, type Quote } from "@/lib/pricing";
import { audit } from "./audit";
import { readCatalogue } from "./catalogue";
import type { Db } from "./db";
import { getSettings } from "./settings";

/**
 * Owner notifications by email, sent through Resend (https://resend.com) with
 * plain fetch. Only the owner is emailed; customers never get automatic emails.
 * Without RESEND_API_KEY nothing is sent and the control room says so.
 */
const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "Hackulator <onboarding@resend.dev>";
const TIMEOUT_MS = 8000;

export function emailReady() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function orderEmailRecipient(db: Db) {
  return (await getSettings(db)).orderEmailTo || siteConfig.contact.email || "";
}

type SendResult = { sent: true } | { sent: false; reason: string };

export async function sendOwnerEmail(to: string, subject: string, text: string, replyTo?: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "Email isn't set up (RESEND_API_KEY is missing)." };
  if (!to) return { sent: false, reason: "No address to send order emails to." };
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: [to],
        subject,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return { sent: true };
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { sent: false, reason: `Email service said ${res.status}${body.message ? `: ${body.message}` : ""}` };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "Couldn't reach the email service." };
  }
}

/**
 * Email the owner about a new order request. Never throws: the request is already
 * saved, so a failed email is recorded in the audit log instead of failing the customer.
 */
export async function notifyOrderRequest(db: Db, reference: string, siteOrigin?: string): Promise<SendResult> {
  try {
    const [e] = await db.query<{
      reference: string;
      name: string;
      email: string;
      message: string;
      build: unknown;
      quote: Quote | null;
      waitlist_code: string | null;
      waitlist_name: string | null;
    }>(
      `select e.reference, e.name, e.email, e.message, e.build, e.quote, w.code as waitlist_code, w.name as waitlist_name
         from enquiries e left join waitlist w on w.id = e.waitlist_id where e.reference = $1 and e.kind = 'order'`,
      [reference],
    );
    if (!e) return { sent: false, reason: "Order request not found." };
    const catalogue = await readCatalogue(db);
    const build = sanitizeBuild(e.build, catalogue);
    const lines = [
      `New order request ${e.reference}`,
      "",
      `Name: ${e.name}`,
      `Email: ${e.email}`,
      `Waitlist ID: ${e.waitlist_code ?? "none"}${e.waitlist_name ? ` (${e.waitlist_name})` : ""}`,
      e.quote ? `Extras subtotal: ${formatPence(e.quote.extrasSubtotal)}` : "",
      "",
      e.message ? `Their note:\n${e.message}\n` : "",
      buildSummaryText(build, e.quote ?? quote(build, catalogue), catalogue),
      "",
      siteOrigin ? `Open in the control room: ${siteOrigin}/admin/enquiries` : "Open Enquiries in the control room to accept it.",
      "",
      "Reply to this email to answer the customer directly. Nothing has been charged.",
    ];
    const result = await sendOwnerEmail(
      await orderEmailRecipient(db),
      `New Hackulator order request ${e.reference} from ${e.name}`,
      lines.filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n"),
      e.email,
    );
    if (!result.sent) await audit(db, "system", "enquiry.email_failed", "enquiry", e.reference, { reason: result.reason });
    return result;
  } catch (err) {
    console.error(err);
    return { sent: false, reason: "Couldn't prepare the email." };
  }
}
