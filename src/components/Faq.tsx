import { PRICES, formatPence } from "@/config/offer";


const ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Can I buy a Hackulator today?",
    a: (
      <>
        <p>
          Not yet. Hackulator is a prototype project in development. Display sourcing, running on a single AAA battery
          and final manufacturing are still being worked out, and the base price hasn&apos;t been set.
        </p>
        <p>You can put a build together and save the summary, but nothing on this site takes orders or payments.</p>
      </>
    ),
  },
  {
    q: "What comes with the base Hackulator, and what is extra?",
    a: (
      <>
        <p>
          Every Hackulator includes Snake, 2048 and Tetris. These are never charged
          for and can&apos;t be removed from your build.
        </p>
        <p>
          Extras are optional: single games ({formatPence(250)} each), the Classics Pack (
          {formatPence(500)}), Custom UI ({formatPence(PRICES.customUi)}), a name on the cover (
          {formatPence(PRICES.coverName)}), an icon on the cover ({formatPence(PRICES.coverIcon)}), or one of the two
          forever passes.
        </p>
      </>
    ),
  },
  {
    q: "What does “forever” mean for the passes?",
    a: (
      <>
        <p>
          It means forever. The Gamer ({formatPence(PRICES.allGamesForever)}) covers every current and future
          compatible game, including installation, updates and reinstallation of those games, with no renewal and no
          extra charge.
        </p>
        <p>
          The Hacker ({formatPence(PRICES.allSoftwareForever)}) does the same for all compatible
          software you want, games and Custom UI included. It isn&apos;t limited to the games that exist on the day you
          buy it.
        </p>
      </>
    ),
  },
  {
    q: "If I uninstall a game, do I lose it?",
    a: (
      <p>
        No. Owning a game and having it installed are separate. Deleting or temporarily uninstalling something to free
        up space doesn&apos;t remove your ownership of it.
      </p>
    ),
  },
  {
    q: "Which calculators is it compatible with?",
    a: (
      <p>
        Hackulator is built from an ordinary Casio scientific calculator. Not every model is suitable, so ask before
        planning a build if you want to use a calculator you already have.
      </p>
    ),
  },
  {
    q: "Is this an official Casio product?",
    a: (
      <p>
        No. Hackulator is an independent modification project. It isn&apos;t made, endorsed or supported by Casio.
        Replacing the electronics means the device is no longer the original calculator.
      </p>
    ),
  },
  {
    q: "Can I use it in exams or at school?",
    a: (
      <p>
        A Hackulator is a modified device, so it won&apos;t be approved for exams. Only use it where games and modified
        devices are allowed, and follow your school&apos;s or exam board&apos;s rules.
      </p>
    ),
  },
  {
    q: "What does joining the waitlist mean?",
    a: (
      <>
        <p>
          Joining is free and there&apos;s no obligation to buy. It simply reserves your place in the manufacturing
          queue for the first small batch, in the order people joined.
        </p>
        <p>
          When your spot comes up, we&apos;ll contact you personally with the price and details, and you decide then.
          Nothing is ever charged on this website, and you can leave the list any time.
        </p>
      </>
    ),
  },
  {
    q: "Is the Arcade Pack available?",
    a: (
      <p>
        Not yet. It will contain Block Blast, Space Invaders and a third game that
        hasn&apos;t been decided. It can&apos;t be chosen until all three are confirmed.
      </p>
    ),
  },
  {
    q: "How do I enquire?",
    a: (
      <p>
        Put your build together in Build Yours, then choose Ask a question or Send order request. You can also save
        or copy the summary for later.
      </p>
    ),
  },
];

export function Faq() {
  return (
    <div className="faq">
      {ITEMS.map((item) => (
        <details key={item.q}>
          <summary>{item.q}</summary>
          <div className="faq__body">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
