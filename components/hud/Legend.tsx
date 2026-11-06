// Owner: Agent E. "Who these 100 women are": status rows + gap line + odds, persona chips, Line them up.
import { chrome, fmtInt, legendGapLine, legendOddsLine, legendTitle, statusLabel } from '@/lib/copy';
import { STATUSES, type LegendProps, type Status } from '@/lib/types';
import PersonaChips from './PersonaChips';

const COLOR: Record<Status, string> = { too_much: 'var(--too-much)', too_little: 'var(--too-little)', qualifies: 'var(--qualifies)' };

function FigureIcon({ status }: { status: Status }) {
  return (
    <svg width="14" height="20" viewBox="0 0 14 20" aria-hidden="true">
      <circle cx="7" cy="4" r="3.2" fill="#F1D3B5" stroke="var(--ink)" strokeWidth="1.2" />
      <rect x="3.5" y="8" width="7" height="8" rx="1.5" fill={COLOR[status]} stroke="var(--ink)" strokeWidth="1.2" />
      <path d="M5.5 16 V19.5 M8.5 16 V19.5" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Legend({ counts, gapCount, result, lineup, onToggleLineup, personas, onPersona }: LegendProps) {
  const total = STATUSES.reduce((s, k) => s + counts[k], 0);
  return (
    <section className="card legend tilt-l" aria-labelledby="legend-title" data-hud="legend">
      <h2 className="label" id="legend-title" style={{ margin: 0 }}>{legendTitle(total)}</h2>
      <ul className="legend-rows">
        {STATUSES.map((s) => (
          <li key={s} className="legend-row">
            <FigureIcon status={s} />
            <span>{statusLabel(s)}</span>
            <span className="count" data-legend-count={s}>{fmtInt(counts[s])}</span>
            {s === 'too_much' && <span className="legend-sub" data-hud="gap-line">{legendGapLine(gapCount)}</span>}
            {s === 'qualifies' && <span className="legend-sub" data-hud="legend-odds">{legendOddsLine(result)}</span>}
          </li>
        ))}
      </ul>
      {/* DOM: chips before the button (tab order, SPEC §9.7); CSS shows the button first */}
      <div className="legend-actions">
        <div className="chips-wrap" style={{ order: 2 }}><PersonaChips personas={personas} onPersona={onPersona} /></div>
        <button type="button" className="pill hud-btn lineup-btn" onClick={onToggleLineup} aria-pressed={lineup} data-hud="lineup">
          {lineup ? chrome.backToMap : chrome.lineUp}
        </button>
      </div>
    </section>
  );
}
