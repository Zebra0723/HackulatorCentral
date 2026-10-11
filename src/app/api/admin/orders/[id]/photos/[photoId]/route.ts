import { readPhoto, removePhoto } from "@/lib/server/orders";
import { idParam, json, withAdmin } from "@/lib/server/http";

export async function GET(req: Request, ctx: { params: Promise<{ id: string; photoId: string }> }) {
  return withAdmin(req, async ({ db }) => {
    const p = await ctx.params;
    const photo = await readPhoto(db, idParam(p.id), idParam(p.photoId));
    if (!photo) return json({ error: "Not found." }, 404);
    return new Response(Buffer.from(photo.bytes), {
      headers: { "Content-Type": photo.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string; photoId: string }> }) {
  return withAdmin(req, async ({ db, admin }) => {
    const p = await ctx.params;
    await removePhoto(db, admin.email, idParam(p.id), idParam(p.photoId));
    return json({ ok: true });
  });
}
