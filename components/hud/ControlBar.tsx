// Owner: Agent E. The slider (house thumb, PgUp/PgDn ±5), live sentence and ✨ Explain this.
import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { chrome, pctPill, sliderLabel, sliderSentence } from '@/lib/copy';
import { MAX_PCT, START_PCT } from '@/lib/constants';
import type { ControlBarProps } from '@/lib/types';

const TICKS = Array.from({ length: Math.floor(MAX_PCT / 5) + 1 }, (_, i) => i * 5);
const at = (v: number) => `${(v / MAX_PCT) * 100}%`;

function splitSparkle(s: string): [string, string] {
  return s.startsWith('✨') ? ['✨', s.slice('✨'.length)] : ['', s];
}

export default function ControlBar({ pct, onChange, onExplain, explainLoading, hasDragged }: ControlBarProps) {
  // drag direction, so the house thumb leans the way it's moving
  const [prevPct, setPrevPct] = useState(pct);
  const [dir, setDir] = useState<'up' | 'down'>('up');
  if (prevPct !== pct) { setPrevPct(pct); setDir(pct > prevPct ? 'up' : 'down'); }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'PageUp') { e.preventDefault(); onChange(Math.min(MAX_PCT, pct + 5)); }
    else if (e.key === 'PageDown') { e.preventDefault(); onChange(Math.max(0, pct - 5)); }
  };
  const [sparkle, explainText] = splitSparkle(chrome.explain);
  const pill = pctPill(pct);

  return (
    <section className="card controlbar" aria-labelledby="cb-label" data-hud="controlbar">
      <div className="cb-top">
        <p className="cb-label" id="cb-label">{sliderLabel}</p>
        <span key={pct} className={`pill pct-pill num${hasDragged ? ' bounce' : ''}`} aria-hidden="true" data-hud="pct">{pill}</span>
      </div>
      <div className="cb-slider">
        <span className={`drag-me${hasDragged ? ' gone' : ''}`} style={{ left: `calc(15px + (100% - 30px) * ${pct / MAX_PCT})` }} aria-hidden="true">
          {chrome.dragMe}
        </span>
        <input
          className="hud-range"
          type="range"
          min={0}
          max={MAX_PCT}
          step={1}
          value={pct}
          onChange={(e) => onChange(Number(e.currentTarget.value))}
          onKeyDown={onKeyDown}
          aria-labelledby="cb-label"
          aria-valuetext={pill}
          data-dir={dir}
          style={{ '--fill': at(pct) } as CSSProperties}
          data-hud="slider"
        />
        <div className="cb-ticks" aria-hidden="true">
          {TICKS.map((v) => (
            <span key={v} className="cb-tick" style={{ left: at(v) }}>
              <svg width="8" height="8" viewBox="0 0 8 8"><path d="M4 0 Q6 2 4 4 Q2 6 4 8" fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" /></svg>
              {pctPill(v)}
            </span>
          ))}
          <span className="cb-start" style={{ left: at(START_PCT) }}>{chrome.startingPoint}</span>
        </div>
      </div>
      <div className="cb-bottom">
        <p className="cb-sentence" data-hud="sentence">{sliderSentence(pct)}</p>
        <button type="button" className="pill hud-btn explain-btn" onClick={onExplain} aria-busy={explainLoading} data-hud="explain">
          {sparkle && <span className="sparkle" aria-hidden="true">{sparkle}</span>}{explainText}
        </button>
      </div>
    </section>
  );
}
