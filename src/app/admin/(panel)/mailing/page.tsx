import { headers } from "next/headers";
import { MailingComposer, SubscriberList } from "@/components/admin/MailingAdmin";
import { fmtDate, fmtDateTime } from "@/components/admin/fmt";
import { STARTER_NEWSLETTER, sanitizeNewsletter } from "@/lib/email/newsletter";
import { requireAdminPage } from "@/lib/server/http";
import { getDraft, listSubscribers, mailingSummary, renderContext, sentCampaigns } from "@/lib/server/mailing";
import { bulkEmailReady, emailReady, orderEmailRecipient } from "@/lib/server/notify";

export default async function MailingPage() {
  const { db } = await requireAdminPage();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const siteUrl = `${proto}://${host}`;

  const [draft, subs, summary, past, ctx, testTo] = await Promise.all([
    getDraft(db),
    listSubscribers(db),
    mailingSummary(db),
    sentCampaigns(db),
    renderContext(db, siteUrl),
    orderEmailRecipient(db),
  ]);
  const days = summary.daysSinceLast;
  const initial = draft ? sanitizeNewsletter(draft.content) : past[0] ? sanitizeNewsletter(past[0].content) : STARTER_NEWSLETTER;

  return (
    <div className="a-stack">
      <div className="a-head">
        <h1>Mailing list · The Weekly Drop</h1>
        <span className="a-muted">
          {summary.active} subscribed{summary.unsubscribed ? ` · ${summary.unsubscribed} unsubscribed` : ""}
        </span>
      </div>
      <div className="a-tiles">
        <div className="a-tile">
          <span className="a-tile__n">{summary.active}</span>
          <span className="a-tile__l">subscribers</span>
        </div>
        <div className="a-tile">
          <span className="a-tile__n">#{ctx.issueNumber}</span>
          <span className="a-tile__l">next issue</span>
        </div>
        <div className={`a-tile${days == null || days >= 7 ? " a-tile--due" : ""}`}>
          <span className="a-tile__n">{days == null ? "—" : days === 0 ? "Today" : `${days}d`}</span>
          <span className="a-tile__l">{days == null ? "nothing sent yet" : days >= 7 ? "since the last one · due! 📬" : "since the last one"}</span>
        </div>
      </div>
      <p className="a-note">
        People only get this if they ticked the box to sign up (homepage or waitlist form). Every email has a one-click unsubscribe link,
        and unsubscribed people are never emailed.
      </p>
      <MailingComposer
        initial={initial}
        issueNumber={ctx.issueNumber}
        waitlist={ctx.waitlist}
        subscribers={summary.active}
        emailReady={emailReady()}
        bulkReady={bulkEmailReady()}
        testTo={testTo}
        siteUrl={siteUrl}
        past={past.map((p) => ({
          id: p.id,
          subject: p.subject,
          sentAt: fmtDateTime(p.sent_at),
          recipients: p.recipients,
          failed: p.failed,
          content: sanitizeNewsletter(p.content),
        }))}
      />
      <section className="a-card">
        <h2>Subscribers</h2>
        <SubscriberList
          rows={subs.map((s) => ({
            id: s.id,
            email: s.email,
            name: s.name,
            source: s.source,
            joined: fmtDate(s.created_at),
            unsubscribed: Boolean(s.unsubscribed_at),
          }))}
        />
      </section>
    </div>
  );
}
