import { json, withAdmin } from "@/lib/server/http";
import { orderEmailRecipient, sendOwnerEmail } from "@/lib/server/notify";

/** Send a test message to the order email address so the owner can check it arrives. */
export async function POST(req: Request) {
  return withAdmin(req, async ({ db }) => {
    const to = await orderEmailRecipient(db);
    const result = await sendOwnerEmail(
      to,
      "Hackulator test email",
      "This is a test from your Hackulator control room. New order requests will arrive at this address like this.",
    );
    return result.sent ? json({ ok: true, to }) : json({ error: result.reason }, 502);
  });
}
