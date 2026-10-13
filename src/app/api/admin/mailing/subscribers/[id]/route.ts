import { idParam, json, withAdmin } from "@/lib/server/http";
import { removeSubscriber } from "@/lib/server/mailing";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAdmin(req, async ({ db, admin }) => {
    await removeSubscriber(db, admin.email, idParam((await params).id));
    return json({ ok: true });
  });
}
