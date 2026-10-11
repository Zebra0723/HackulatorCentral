import { addService } from "@/lib/server/devices";
import { idParam, json, readJson, withAdmin } from "@/lib/server/http";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAdmin(req, async ({ db, admin }) => {
    await addService(db, admin.email, idParam((await ctx.params).id), await readJson(req));
    return json({ ok: true }, 201);
  });
}
