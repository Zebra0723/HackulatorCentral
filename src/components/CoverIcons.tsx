import type { CoverIconId } from "@/config/offer";

/** Original 9×9 pixel icons for the cover-icon option. */
const ART: Record<CoverIconId, string[]> = {
  bolt: ["....##...", "...##....", "..##.....", ".#######.", "....##...", "...##....", "..##.....", ".##......", ".#......."],
  star: ["....#....", "....#....", "...###...", "#########", ".#######.", "..#####..", "..##.##..", ".##...##.", ".#.....#."],
  heart: [".........", ".##...##.", "####.####", "#########", "#########", ".#######.", "..#####..", "...###...", "....#...."],
  rocket: ["....#....", "...###...", "...#.#...", "...###...", "...###...", "..#####..", ".##.#.##.", ".#..#..#.", "...#.#..."],
  note: ["...#####.", "...#...#.", "...#...#.", "...#...#.", "...#...#.", ".###.###.", "####.####", "####.####", ".##...##."],
  invader: ["..#...#..", "...#.#...", "..#####..", ".##.#.##.", "#########", "#.#####.#", "#.#...#.#", "...#.#...", "........."],
};

export function CoverIcon({ id, className }: { id: CoverIconId; className?: string }) {
  const rows = ART[id];
  return (
    <svg viewBox="0 0 9 9" className={className} aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      {rows.flatMap((row, y) =>
        row.split("").map((ch, x) => (ch === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" /> : null)),
      )}
    </svg>
  );
}
