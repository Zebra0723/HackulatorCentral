/**
 * Original front-view illustration of a scientific-calculator-shaped
 * Hackulator with a colour screen. Generic key legends only; no third-party
 * branding.
 */
export function CalculatorIllustration({ title = "Illustration of a Hackulator showing its colour game menu" }: { title?: string }) {
  const numRows = [
    ["7", "8", "9", "DEL", "AC"],
    ["4", "5", "6", "×", "÷"],
    ["1", "2", "3", "+", "−"],
    ["0", ".", "×10ˣ", "Ans", "="],
  ];
  const fnRows = 3;
  const fnCols = 6;

  return (
    <svg viewBox="0 0 300 580" role="img" aria-labelledby="calc-illus-title">
      <title id="calc-illus-title">{title}</title>
      <defs>
        <linearGradient id="calc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2b2a" />
          <stop offset="1" stopColor="#1a1a19" />
        </linearGradient>
        <linearGradient id="calc-key" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a5a57" />
          <stop offset="1" stopColor="#474744" />
        </linearGradient>
        <linearGradient id="calc-num" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9e6df" />
          <stop offset="1" stopColor="#d6d2c9" />
        </linearGradient>
      </defs>

      {/* body */}
      <rect x="6" y="6" width="288" height="568" rx="34" fill="url(#calc-body)" />
      <rect x="6.5" y="6.5" width="287" height="567" rx="33.5" fill="none" stroke="#3d3d3b" />

      {/* screen bezel + colour display */}
      <rect x="30" y="36" width="240" height="158" rx="12" fill="#0b0b0b" />
      <g>
        <rect x="42" y="48" width="216" height="134" rx="4" fill="#10140a" />
        <rect x="42" y="48" width="216" height="20" rx="4" fill="#b4e23c" />
        <rect x="42" y="60" width="216" height="8" fill="#b4e23c" />
        <text x="52" y="62.5" fontFamily="ui-monospace, monospace" fontSize="10" fontWeight="700" fill="#1c2606">GAMES</text>
        <text x="248" y="62.5" fontFamily="ui-monospace, monospace" fontSize="10" textAnchor="end" fill="#1c2606">1/3</text>
        {["Snake", "2048", "Blocks"].map((t, i) => (
          <g key={t}>
            {i === 0 && <rect x="48" y={76 + i * 26} width="204" height="22" rx="3" fill="#2a3512" />}
            <rect x="56" y={83 + i * 26} width="8" height="8" fill={["#b4e23c", "#e8c35a", "#7fb6e8"][i]} />
            <text x="72" y={91 + i * 26} fontFamily="ui-monospace, monospace" fontSize="11" fill="#f3f1ec">{t}</text>
          </g>
        ))}
        <text x="150" y="175" fontFamily="ui-monospace, monospace" fontSize="8" fill="#8a8f80" textAnchor="middle">▲▼ select   = play</text>
      </g>

      {/* function keys + navigation pad */}
      {[0, 1].map((r) =>
        [0, 1].map((c) => (
          <rect key={`f${r}${c}`} x={36 + c * 44} y={214 + r * 30} width="36" height="20" rx="6" fill="url(#calc-key)" />
        )),
      )}
      {[0, 1].map((r) =>
        [0, 1].map((c) => (
          <rect key={`g${r}${c}`} x={184 + c * 44} y={214 + r * 30} width="36" height="20" rx="6" fill="url(#calc-key)" />
        )),
      )}
      <circle cx="150" cy="239" r="30" fill="#3a3a38" />
      <circle cx="150" cy="239" r="29.5" fill="none" stroke="#565653" />
      <circle cx="150" cy="239" r="11" fill="#2b2b2a" />
      <path d="M150 214 l5 6 h-10z M150 264 l5 -6 h-10z M125 239 l6 5 v-10z M175 239 l-6 5 v-10z" fill="#9a9893" />

      {/* scientific function rows */}
      {Array.from({ length: fnRows }).map((_, r) =>
        Array.from({ length: fnCols }).map((__, c) => (
          <rect key={`s${r}${c}`} x={30 + c * 41} y={286 + r * 30} width="35" height="20" rx="6" fill="url(#calc-key)" />
        )),
      )}

      {/* number pad */}
      {numRows.map((row, r) =>
        row.map((label, c) => {
          const x = 30 + c * 49;
          const y = 386 + r * 44;
          const accent = label === "=";
          const op = c >= 3 && !accent;
          return (
            <g key={`n${r}${c}`}>
              <rect x={x} y={y} width="42" height="32" rx="8" fill={accent ? "#b4e23c" : op ? "#5a5a57" : "url(#calc-num)"} />
              <text
                x={x + 21}
                y={y + 21}
                textAnchor="middle"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fontSize={label.length > 2 ? 9 : 13}
                fontWeight="600"
                fill={accent ? "#1c2606" : op ? "#f3f1ec" : "#1a1a19"}
              >
                {label}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}
