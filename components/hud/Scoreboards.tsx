'use client';
// Owner: Agent E. Right rail: new homes built · affordable homes · odds (+ lottery simulation).
import { useEffect, useRef, useState } from 'react';
import { affordableHomesCard, householdTypeLabel, lotteryButton, lotteryHeader, lotteryRerunButton, lotteryResult, lotteryRolling, lotteryRow, newHomesCard, oddsRailCard, type RailCard } from '@/lib/copy';
import { HOUSEHOLD_TYPES, runLottery, type HouseholdType, type LotterySummary } from '@/lib/lottery';
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

const FACES = ['\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685'];
const ROLL_MS = 1100;

function Lottery({ meta, result }: { meta: Meta; result: ScoreboardsProps['result'] }) {
  const [run, setRun] = useState<{ pct: number; seed: number; summary: LotterySummary } | null>(null);
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState(0);
  const [shown, setShown] = useState<Record<HouseholdType, number> | null>(null);
  const timer = useRef<number | null>(null);
  const current = run && run.pct === result.pct ? run : null; // clears when the slider moves

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const go = () => {
    if (rolling) return;
    const seed = current ? current.seed + 1 : 2026;
    const summary = runLottery(meta, result, 1000, seed);
    setRun({ pct: result.pct, seed, summary });
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setShown(null); setRolling(false); return; }
    setRolling(true);
    const start = performance.now();
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / ROLL_MS);
      setFace((f) => (f + 1 + Math.floor(Math.random() * 4)) % 6);
      const tick = {} as Record<HouseholdType, number>;
      for (const k of HOUSEHOLD_TYPES) {
        const target = summary.byType[k].median;
        tick[k] = Math.max(0, Math.round(target * t + (1 - t) * (Math.random() - 0.5) * target * 0.6));
      }
      setShown(tick);
      if (t >= 1) {
        if (timer.current) window.clearInterval(timer.current);
        timer.current = null;
        setShown(null);
        setRolling(false);
      }
    }, 70);
  };

  if (result.affordableHomes === 0) return null;
  const s = current?.summary;
  return (
    <div className="lottery">
      <div className="lottery-top">
        <button type="button" className="lottery-btn" data-hud="lottery" onClick={go} disabled={rolling}>
          {current ? lotteryRerunButton : lotteryButton}
        </button>
        {(rolling || current) && (
          <span className={`lottery-die${rolling ? ' rolling' : ''}`} aria-hidden="true">{FACES[rolling ? face : (current!.seed % 6)]}</span>
        )}
      </div>
      {s && (
        <div className="lottery-result" data-hud="lottery-result" aria-live="polite" aria-busy={rolling}>
          <p className="lottery-head">{rolling ? lotteryRolling : lotteryHeader(s)}</p>
          {HOUSEHOLD_TYPES.map((k) => {
            const value = rolling && shown ? shown[k] : s.byType[k].median;
            const row = lotteryRow(s.byType[k]);
            return (
              <div key={k} className={`lottery-row lottery-${k}`} data-type={k}>
                <span className="lottery-label">{householdTypeLabel[k]}</span>
                <span className="lottery-bar"><span style={{ width: `${s.homes ? (100 * value) / s.homes : 0}%` }} /></span>
                <span className="lottery-value">{value}</span>
                {!rolling && <span className="lottery-range">{row.range}</span>}
              </div>
            );
          })}
          <span className="sr-only">{lotteryResult(s)}</span>
        </div>
      )}
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
