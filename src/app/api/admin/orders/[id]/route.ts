import { cancelOrder, deleteOrder, regenerateTracking, setArchived, setEventHidden } from "@/lib/server/orders";
import { idParam, json, readJson, withAdmin } from "@/lib/server/http";

/** Order actions: cancel, archive, delete (test/mistake only), tracking link, hide history entry. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAdmin(req, async ({ db, admin }) => {
    const id = idParam((await ctx.params).id);
    const body = await readJson(req);
    switch (body.action) {
      case "cancel":
        await cancelOrder(db, admin.email, id, String(body.reason ?? ""));
        return json({ ok: true });
      case "archive":
      case "unarchive":
        await setArchived(db, admin.email, id, body.action === "archive");
        return json({ ok: true });
      case "delete":
        await deleteOrder(db, admin.email, id, String(body.confirmation ?? ""));
        return json({ ok: true, deleted: true });
      case "regenerate-link":
        return json({ token: await regenerateTracking(db, admin.email, id) });
      case "revoke-link":
        await regenerateTracking(db, admin.email, id, true);
        return json({ ok: true });
      case "hide-event":
      case "unhide-event":
        await setEventHidden(db, admin.email, id, Number(body.eventId), body.action === "hide-event");
        return json({ ok: true });
      default:
        return json({ error: "Unknown action." }, 400);
    }
  });
}
