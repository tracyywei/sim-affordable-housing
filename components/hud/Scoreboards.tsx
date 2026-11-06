// Owner: Agent E. 🏢 Buildings · 🏠 Affordable homes · 🎟 Odds, each with its change vs. the starting point in words.
import { useState, type CSSProperties } from 'react';
import { affordableCard, buildingsCard, noBuildingsBanner, oddsCard, type ScoreCard } from '@/lib/copy';
import type { ScoreboardsProps } from '@/lib/types';

/** Rolling digits (whimsy): each digit's 0–9 strip is a CSS pseudo-element; the real digit stays in the DOM, transparent. */
function Odometer({ text }: { text: string }) {
  const chars = [...text];
  return (
    <span className="odo">
      {chars.map((c, i) => {
        const pos = chars.length - i; // key from the right so a digit keeps its place as numbers grow
        if (!/[0-9]/.test(c)) return <span key={`c${pos}`} style={{ whiteSpace: 'pre' }}>{c}</span>;
        return (
          <span key={`d${pos}`} className="odo-digit" style={{ '--d': `-${Number(c) * 1.1}em` } as CSSProperties}>{c}</span>
        );
      })}
    </span>
  );
}

const TONE_CLASS = { more: 'up', fewer: 'down', same: 'same' } as const;

function Score({ kind, icon, card, tilt, circleKey, sentence = false }: { kind: string; icon: string; card: ScoreCard; tilt: string; circleKey?: number; sentence?: boolean }) {
  return (
    <section className={`card score ${tilt}`} data-score={kind} aria-label={card.label}>
      <div className="score-head label"><span aria-hidden="true">{icon}</span>{card.label}</div>
      <p className="sr-only">{card.value}</p>
      <div aria-hidden="true">
        <span className="score-big" style={sentence ? { fontSize: 18 } : undefined}>
          {sentence ? card.big : <Odometer text={card.big} />}
          {circleKey !== undefined && (
            <svg key={circleKey} className="odds-circle" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
              <path d="M8 25 C 8 7, 92 5, 94 23 C 96 41, 14 45, 6 29 C 3 20, 30 9, 52 8" vectorEffect="non-scaling-stroke" />
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
  const [prevOdds, setPrevOdds] = useState(result.oddsN);
  const [circle, setCircle] = useState<number | undefined>(undefined);
  if (prevOdds !== result.oddsN) {
    setPrevOdds(result.oddsN);
    setCircle(result.oddsN !== null ? (circle ?? 0) + 1 : undefined);
  }

  return (
    <>
      {result.buildingsBuilt === 0 && <p className="banner" role="status" data-hud="no-buildings">{noBuildingsBanner}</p>}
      <Score kind="buildings" icon="🏢" card={buildingsCard(result, baseline, total)} tilt="tilt-r" />
      <Score kind="affordable" icon="🏠" card={affordableCard(result, baseline)} tilt="tilt-l" />
      <Score kind="odds" icon="🎟" card={oddsCard(result, baseline)} tilt="tilt-r" circleKey={circle} sentence={result.oddsN === null} />
    </>
  );
}
