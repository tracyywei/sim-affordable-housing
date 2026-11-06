// Owner: Agent E. Right rail: new homes built · affordable homes · low-income women left out.
import { affordableHomesCard, leftOutCard, newHomesCard, type RailCard } from '@/lib/copy';
import type { Meta, ScoreboardsProps } from '@/lib/types';

function Score({ kind, card }: { kind: string; card: RailCard }) {
  return (
    <section className="hud-card score" data-score={kind} aria-label={card.label}>
      <h2 className="hud-label">{card.label}</h2>
      <p className="score-big">{card.big}</p>
      <p className="score-sub">{card.sub}</p>
    </section>
  );
}

/** `meta` is extra to ScoreboardsProps (needed by leftOutCard). */
export default function Scoreboards({ result, total, meta }: ScoreboardsProps & { meta?: Meta }) {
  return (
    <>
      <Score kind="newhomes" card={newHomesCard(result, total)} />
      <Score kind="affordable" card={affordableHomesCard(result)} />
      {meta && <Score kind="leftout" card={leftOutCard(meta)} />}
    </>
  );
}
