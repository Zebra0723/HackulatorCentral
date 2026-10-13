import { json, readJson, withAdmin } from "@/lib/server/http";
import { saveDraft, sendCampaign } from "@/lib/server/mailing";

export const maxDuration = 60;

/** Send the weekly email to every active subscriber. */
export async function POST(req: Request) {
  return withAdmin(req, async ({ db, admin }) => {
    const body = await readJson(req, 64 * 1024);
    if (body.confirm !== true) return json({ error: "Please confirm before sending." }, 400);
    await saveDraft(db, admin.email, body.content);
    return json(await sendCampaign(db, admin.email, body.content, new URL(req.url).origin));
  });
}
