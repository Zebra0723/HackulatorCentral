import { getDb } from "@/lib/server/db";
import { readPhoto } from "@/lib/server/orders";

/** Customer photo access: only through a valid, unrevoked tracking token for the same order. */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string; photoId: string }> }) {
  const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const { token, photoId } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token) || !/^\d+$/.test(photoId)) return notFound();
  const db = await getDb();
  if (!db) return notFound();
  const rows = await db.query<{ id: number }>("select id from orders where tracking_token = $1", [token]);
  if (!rows.length) return notFound();
  const photo = await readPhoto(db, rows[0].id, Number(photoId));
  if (!photo) return notFound();
  return new Response(Buffer.from(photo.bytes), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
