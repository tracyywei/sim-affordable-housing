// Owner: Agent E. Legend: three groups (icon · label · share), odds under Eligible, chips, group button.
import { chrome, figureScale, groupRow, legendTitle, scaleLine } from '@/lib/copy';
import { STATUSES, type LegendProps, type Meta, type Status } from '@/lib/types';
import PersonaChips from './PersonaChips';

const COLOR: Record<Status, string> = { too_much: 'var(--too-much)', too_little: 'var(--too-little)', qualifies: 'var(--qualifies)' };

function FigureIcon({ status }: { status: Status }) {
  return (
    <svg width="12" height="18" viewBox="0 0 12 18" aria-hidden="true">
      <circle cx="6" cy="3.5" r="3" fill={COLOR[status]} />
      <rect x="2.5" y="7.5" width="7" height="10" rx="2" fill={COLOR[status]} />
    </svg>
  );
}

/** `meta` is extra to LegendProps (needed for the figure scale). */
export default function Legend({ counts, lineup, onToggleLineup, personas, onPersona, meta }: LegendProps & { meta?: Meta }) {
  const total = STATUSES.reduce((s, k) => s + counts[k], 0);
  const scale = meta ? figureScale(meta) : 1;
  return (
    <section className="hud-card legend" aria-labelledby="legend-title" data-hud="legend">
      <h2 className="hud-label" id="legend-title">{legendTitle()}</h2>
      <p className="legend-scale">{scaleLine(scale)}</p>
      <ul className="legend-rows">
        {STATUSES.map((s) => {
          const row = groupRow(s, counts[s], total, scale);
          return (
            <li key={s} className="legend-row">
              <FigureIcon status={s} />
              <span>{row.label}</span>
              <span className="count" data-legend-count={s}>{row.pct}</span>
            </li>
          );
        })}
      </ul>
      <div className="legend-actions">
        <PersonaChips personas={personas} onPersona={onPersona} />
        <button type="button" className="hud-btn lineup-btn" onClick={onToggleLineup} aria-pressed={lineup} data-hud="lineup">
          {lineup ? chrome.backToMap : chrome.lineUp}
        </button>
      </div>
    </section>
  );
}
