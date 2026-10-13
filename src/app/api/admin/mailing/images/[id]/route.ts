import { json, withAdmin } from "@/lib/server/http";
import { deleteEmailImage } from "@/lib/server/mailing";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAdmin(req, async ({ db, admin }) => {
    await deleteEmailImage(db, admin.email, (await ctx.params).id);
    return json({ ok: true });
  });
}
