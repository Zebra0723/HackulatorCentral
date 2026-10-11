import { setEnquiryStatus } from "@/lib/server/orders";
import { idParam, json, readJson, withAdmin } from "@/lib/server/http";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAdmin(req, async ({ db, admin }) => {
    const id = idParam((await ctx.params).id);
    const body = await readJson(req);
    await setEnquiryStatus(db, admin.email, id, String(body.status ?? ""));
    return json({ ok: true });
  });
}
