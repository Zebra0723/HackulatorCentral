import { getDb } from "@/lib/server/db";
import { readEmailImage } from "@/lib/server/mailing";

/** Public: pictures uploaded for the weekly email. Mail apps load these, so they're cacheable forever (IDs never change). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const db = await getDb().catch(() => null);
  if (!db) return notFound();
  const image = await readEmailImage(db, (await ctx.params).id);
  if (!image) return notFound();
  return new Response(Buffer.from(image.bytes), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
