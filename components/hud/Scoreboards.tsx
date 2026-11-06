// Owner: Agent E. 🏢 Buildings · 🏠 Affordable homes · 🎟 Odds, each with its change vs. the starting point in words.
import { useEffect, useRef, useState } from 'react';
import { affordableCard, buildingsCard, noBuildingsBanner, oddsCard, type ScoreCard } from '@/lib/copy';
import type { ScoreboardsProps } from '@/lib/types';

const TONE_CLASS = { more: 'up', fewer: 'down', same: 'same' } as const;

function Score({ kind, icon, card, tilt, circleKey, sentence = false }: { kind: string; icon: string; card: ScoreCard; tilt: string; circleKey?: number; sentence?: boolean }) {
  return (
    <section className={`card score ${tilt}`} data-score={kind} aria-label={card.label}>
      <div className="score-head label"><span aria-hidden="true">{icon}</span>{card.label}</div>
      <p className="sr-only">{card.value}</p>
      <div aria-hidden="true">
        <span className="score-big" style={sentence ? { fontSize: 18 } : undefined}>
          {card.big}
          {circleKey !== undefined && (
            <svg key={circleKey} className="odds-circle" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
              <path d="M8 26 C 8 6, 92 4, 94 24 C 96 44, 14 48, 6 30 C 3 20, 30 8, 52 7" vectorEffect="non-scaling-stroke" />
            </svg>
          )}
        </span>
        {card.of && <span className="score-sub">{card.of}</span>}
      </div>
      {card.sub && <p className="score-note">{card.sub}</p>}
      {card.change && <p className={`score-change ${TONE_CLASS[card.change.tone]}`}>{card.change.text}</p>}
    </section>
  );
}

export default function Scoreboards({ result, baseline, total }: ScoreboardsProps) {
  // the self-drawing circle around the odds whenever they change (not on first paint)
  const prevOdds = useRef(result.oddsN);
  const [circle, setCircle] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (prevOdds.current === result.oddsN) return;
    prevOdds.current = result.oddsN;
    if (result.oddsN !== null) setCircle((c) => (c ?? 0) + 1);
    else setCircle(undefined);
  }, [result.oddsN]);

  return (
    <>
      {result.buildingsBuilt === 0 && <p className="banner" role="status" data-hud="no-buildings">{noBuildingsBanner}</p>}
      <Score kind="buildings" icon="🏢" card={buildingsCard(result, baseline, total)} tilt="tilt-r" />
      <Score kind="affordable" icon="🏠" card={affordableCard(result, baseline)} tilt="tilt-l" />
      <Score kind="odds" icon="🎟" card={oddsCard(result, baseline)} tilt="tilt-r" circleKey={circle} sentence={result.oddsN === null} />
    </>
  );
}
