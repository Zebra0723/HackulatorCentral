import { PRICES, formatPence } from "@/config/offer";

type Cell = { yes: string } | { no: string } | { tbc: string };

const ROWS: { label: string; cells: [Cell, Cell, Cell] }[] = [
  {
    label: "Snake, 2048 and Blocks",
    cells: [{ yes: "Included" }, { yes: "Included" }, { yes: "Included" }],
  },
  {
    label: "Current extra games",
    cells: [{ no: "Pay for the ones you pick" }, { yes: "All included" }, { yes: "All included" }],
  },
  {
    label: "Future compatible games",
    cells: [{ no: "Not included" }, { yes: "All included" }, { yes: "All included" }],
  },
  {
    label: "Other future compatible software",
    cells: [{ no: "Not included" }, { no: "Not included" }, { yes: "Everything you want" }],
  },
  {
    label: "Custom UI",
    cells: [
      { no: `${formatPence(PRICES.customUi)} extra` },
      { no: `${formatPence(PRICES.customUi)} extra` },
      { yes: "Included" },
    ],
  },
  {
    label: "Installation, updates and reinstalls",
    cells: [
      { tbc: "Terms to be confirmed" },
      { yes: "No extra charge for covered games" },
      { yes: "No extra charge for included software" },
    ],
  },
  {
    label: "Renewal or subscription",
    cells: [{ yes: "None" }, { yes: "None, ever" }, { yes: "None, ever" }],
  },
];

function CellView({ c }: { c: Cell }) {
  if ("yes" in c) return <span className="yes">{c.yes}</span>;
  if ("no" in c) return <span className="no">{c.no}</span>;
  return <span className="no">{c.tbc}</span>;
}

export function Compare() {
  return (
    <>
      <p className="compare-hint small muted">Swipe sideways to compare all three options.</p>
      <div className="compare-wrap" role="region" aria-label="Software options compared" tabIndex={0}>
        <table className="compare">
          <caption className="visually-hidden">
            Comparison of choosing games individually, The Gamer (all games forever) and The Hacker (all software and Custom UI forever). Prices
            are extras on top of the unannounced base price.
          </caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Feature</span>
              </th>
              <th scope="col">
                Choose games
                <span className="price">From £0</span>
              </th>
              <th scope="col">
                The Gamer
                <span className="tier-sub">All games, forever</span>
                <span className="price">{formatPence(PRICES.allGamesForever)}</span>
              </th>
              <th scope="col">
                The Hacker
                <span className="tier-sub">All software + Custom UI, forever</span>
                <span className="price">{formatPence(PRICES.allSoftwareForever)}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                {r.cells.map((c, i) => (
                  <td key={i}>
                    <CellView c={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
