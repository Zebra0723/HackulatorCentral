import { json, readJson, withAdmin } from "@/lib/server/http";
import { sendTestCampaign } from "@/lib/server/mailing";
import { orderEmailRecipient } from "@/lib/server/notify";

/** Send the current draft to the owner only. */
export async function POST(req: Request) {
  return withAdmin(req, async ({ db }) => {
    const to = await orderEmailRecipient(db);
    const r = await sendTestCampaign(db, await readJson(req, 64 * 1024), to, new URL(req.url).origin);
    return r.sent ? json({ ok: true, to }) : json({ error: r.reason }, 502);
  });
}
