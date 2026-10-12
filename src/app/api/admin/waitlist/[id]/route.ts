import { idParam, json, readJson, withAdmin } from "@/lib/server/http";
import { deleteWaitlistEntry, moveWaitlistEntry, regenerateWaitlistCode, updateWaitlistEntry } from "@/lib/server/waitlist";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAdmin(req, async ({ db, admin }) => {
    const id = idParam((await ctx.params).id);
    const body = await readJson(req);
    if (body.move === "up" || body.move === "down") await moveWaitlistEntry(db, admin.email, id, body.move);
    else if (body.newId === true) await regenerateWaitlistCode(db, admin.email, id);
    else await updateWaitlistEntry(db, admin.email, id, body);
    return json({ ok: true });
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAdmin(req, async ({ db, admin }) => {
    await deleteWaitlistEntry(db, admin.email, idParam((await ctx.params).id));
    return json({ ok: true });
  });
}
