// Owner: Agent E. Right rail: new homes built · affordable homes · odds of getting one.
import { affordableHomesCard, newHomesCard, oddsRailCard, type RailCard } from '@/lib/copy';
import type { ScoreboardsProps } from '@/lib/types';

function Score({ kind, card }: { kind: string; card: RailCard }) {
  return (
    <section className="hud-card score" data-score={kind} aria-label={card.label}>
      <h2 className="hud-label">{card.label}</h2>
      <p className="score-big">{card.big}</p>
      <p className="score-sub">{card.sub}</p>
    </section>
  );
}

export default function Scoreboards({ result, total }: ScoreboardsProps) {
  return (
    <>
      <Score kind="newhomes" card={newHomesCard(result, total)} />
      <Score kind="affordable" card={affordableHomesCard(result)} />
      <Score kind="odds" card={oddsRailCard(result)} />
    </>
  );
}
