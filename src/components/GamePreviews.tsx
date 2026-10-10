/** Original static concept screens for the base games. Not hardware captures. */

const TILE_COLOURS: Record<number, [string, string]> = {
  0: ["#1d2016", "#1d2016"],
  2: ["#e9e6df", "#1a1a19"],
  4: ["#d9d4c7", "#1a1a19"],
  8: ["#e8c35a", "#1a1a19"],
  16: ["#e3a24a", "#1a1a19"],
  32: ["#d9793d", "#fff"],
  64: ["#c8572f", "#fff"],
  128: ["#b4e23c", "#1c2606"],
  256: ["#9ccc2a", "#1c2606"],
};

export function Preview2048() {
  const grid = [
    [2, 0, 4, 8],
    [0, 16, 8, 2],
    [4, 32, 64, 0],
    [2, 128, 256, 4],
  ];
  const size = 44;
  const gap = 6;
  return (
    <svg viewBox="0 0 320 240" className="mini-screen" role="img" aria-label="Concept screen of 2048: a four by four grid of numbered tiles">
      <rect width="320" height="240" fill="#10140a" />
      <text x="16" y="28" fontFamily="ui-monospace, monospace" fontSize="14" fontWeight="700" fill="#f3f1ec">2048</text>
      <text x="16" y="50" fontFamily="ui-monospace, monospace" fontSize="10" fill="#8a8f80">SCORE</text>
      <text x="16" y="66" fontFamily="ui-monospace, monospace" fontSize="14" fill="#b4e23c">1 284</text>
      <g transform="translate(110 12)">
        <rect width={4 * size + 5 * gap} height={4 * size + 5 * gap} rx="6" fill="#2a2e22" />
        {grid.map((row, r) =>
          row.map((v, c) => {
            const [bg, fg] = TILE_COLOURS[v];
            const x = gap + c * (size + gap);
            const y = gap + r * (size + gap);
            return (
              <g key={`${r}-${c}`}>
                <rect x={x} y={y} width={size} height={size} rx="4" fill={bg} />
                {v > 0 && (
                  <text
                    x={x + size / 2}
                    y={y + size / 2 + 5}
                    textAnchor="middle"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                    fontWeight="700"
                    fontSize={v >= 100 ? 15 : 18}
                    fill={fg}
                  >
                    {v}
                  </text>
                )}
              </g>
            );
          }),
        )}
      </g>
    </svg>
  );
}

const PIECE_COLOURS = ["#b4e23c", "#7fb6e8", "#e8c35a", "#d9793d", "#b39ddb", "#e9e6df"];

export function PreviewBlocks() {
  // 10 x 12 well, 0 = empty, n = colour index + 1
  const well = [
    "..........",
    "....11....",
    ".....1....",
    "..........",
    "..........",
    "..........",
    "..........",
    "6.........",
    "66....3...",
    "26..4433.5",
    "2224443355",
    "2.66553355",
  ];
  const cell = 17;
  const ox = 104;
  const oy = 16;
  return (
    <svg viewBox="0 0 320 240" className="mini-screen" role="img" aria-label="Concept screen of Blocks: coloured falling pieces stacking in a well">
      <rect width="320" height="240" fill="#10140a" />
      <text x="16" y="28" fontFamily="ui-monospace, monospace" fontSize="14" fontWeight="700" fill="#f3f1ec">BLOCKS</text>
      <text x="16" y="50" fontFamily="ui-monospace, monospace" fontSize="10" fill="#8a8f80">LINES</text>
      <text x="16" y="66" fontFamily="ui-monospace, monospace" fontSize="14" fill="#b4e23c">12</text>
      <text x="16" y="90" fontFamily="ui-monospace, monospace" fontSize="10" fill="#8a8f80">LEVEL</text>
      <text x="16" y="106" fontFamily="ui-monospace, monospace" fontSize="14" fill="#f3f1ec">3</text>
      <rect x={ox - 3} y={oy - 3} width={10 * cell + 6} height={12 * cell + 6} fill="none" stroke="#3a3f30" strokeWidth="2" />
      {well.map((row, r) =>
        row.split("").map((ch, c) =>
          ch === "." ? null : (
            <rect
              key={`${r}-${c}`}
              x={ox + c * cell + 1}
              y={oy + r * cell + 1}
              width={cell - 2}
              height={cell - 2}
              rx="2"
              fill={PIECE_COLOURS[Number(ch) - 1]}
            />
          ),
        ),
      )}
      <text x="314" y="28" fontFamily="ui-monospace, monospace" fontSize="10" fill="#8a8f80" textAnchor="end">NEXT</text>
      {[
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 1],
      ].map(([x, y], i) => (
        <rect key={i} x={287 + x * 9} y={38 + y * 9} width="8" height="8" rx="2" fill="#7fb6e8" />
      ))}
    </svg>
  );
}
