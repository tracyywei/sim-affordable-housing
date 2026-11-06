// Owner: Agent E. The slider (house thumb; arrows ±1, PgUp/PgDn ±5).
import type { CSSProperties, KeyboardEvent } from 'react';
import { pctPill, sliderLabel } from '@/lib/copy';
import { MAX_PCT } from '@/lib/constants';
import type { ControlBarProps } from '@/lib/types';

const TICKS = Array.from({ length: Math.floor(MAX_PCT / 5) + 1 }, (_, i) => i * 5);
const at = (v: number) => `${(v / MAX_PCT) * 100}%`;

export default function ControlBar({ pct, onChange }: ControlBarProps) {
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'PageUp') { e.preventDefault(); onChange(Math.min(MAX_PCT, pct + 5)); }
    else if (e.key === 'PageDown') { e.preventDefault(); onChange(Math.max(0, pct - 5)); }
  };
  const pill = pctPill(pct);

  return (
    <section className="hud-card controlbar" aria-labelledby="cb-label" data-hud="controlbar">
      <div className="cb-top">
        <p className="cb-label" id="cb-label">{sliderLabel}</p>
        <span className="pct-pill" aria-hidden="true" data-hud="pct">{pill}</span>
      </div>
      <div className="cb-slider">
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
          style={{ '--fill': at(pct) } as CSSProperties}
          data-hud="slider"
        />
        <div className="cb-ticks" aria-hidden="true">
          {TICKS.map((v) => <span key={v} className="cb-tick" style={{ left: at(v) }}>{pctPill(v)}</span>)}
        </div>
      </div>
    </section>
  );
}
