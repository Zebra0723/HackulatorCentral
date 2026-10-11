import { updateTracking } from "@/lib/server/orders";
import { idParam, json, readJson, withAdmin } from "@/lib/server/http";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAdmin(req, async ({ db, admin }) => {
    const id = idParam((await ctx.params).id);
    const order = await updateTracking(db, admin.email, id, await readJson(req));
    return json({ ok: true, status: order.status });
  });
}
