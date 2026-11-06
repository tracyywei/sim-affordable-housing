'use client';
// Owner: Agent E. Right rail: new homes built · affordable homes · odds (+ lottery simulation).
import { useState } from 'react';
import { affordableHomesCard, lotteryButton, lotteryRerunButton, lotteryResult, newHomesCard, oddsRailCard, type RailCard } from '@/lib/copy';
import { runLottery, type LotterySummary } from '@/lib/lottery';
import type { Meta, ScoreboardsProps } from '@/lib/types';

function Score({ kind, card, children }: { kind: string; card: RailCard; children?: React.ReactNode }) {
  return (
    <section className="hud-card score" data-score={kind} aria-label={card.label}>
      <h2 className="hud-label">{card.label}</h2>
      <p className="score-big">{card.big}</p>
      <p className="score-sub">{card.sub}</p>
      {children}
    </section>
  );
}

function Lottery({ meta, result }: { meta: Meta; result: ScoreboardsProps['result'] }) {
  const [run, setRun] = useState<{ pct: number; seed: number; summary: LotterySummary } | null>(null);
  const current = run && run.pct === result.pct ? run : null; // clears when the slider moves
  const go = () => {
    const seed = current ? current.seed + 1 : 2026;
    setRun({ pct: result.pct, seed, summary: runLottery(meta, result, 1000, seed) });
  };
  if (result.affordableHomes === 0) return null;
  return (
    <div className="lottery">
      <button type="button" className="lottery-btn" data-hud="lottery" onClick={go}>
        {current ? lotteryRerunButton : lotteryButton}
      </button>
      {current && <p className="lottery-result" data-hud="lottery-result" aria-live="polite">{lotteryResult(current.summary)}</p>}
    </div>
  );
}

export default function Scoreboards({ result, total, meta }: ScoreboardsProps) {
  return (
    <>
      <Score kind="newhomes" card={newHomesCard(result, total)} />
      <Score kind="affordable" card={affordableHomesCard(result)} />
      <Score kind="odds" card={oddsRailCard(result)}>
        {meta && <Lottery meta={meta} result={result} />}
      </Score>
    </>
  );
}
