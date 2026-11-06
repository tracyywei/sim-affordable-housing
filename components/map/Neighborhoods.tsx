'use client';
// Flat illustrated neighborhoods (SPEC §9.2, §9.3). Labels show only when zoomed past 2x (CSS: .zoomed).
import { memo } from 'react';
import type { NhoodShape } from '@/lib/layout';

function NeighborhoodsImpl({ shapes }: { shapes: NhoodShape[] }) {
  return (
    <g className="nhoods">
      <g className="nhood-fills" filter="url(#wobble)">
        {shapes.map((s) => (
          <path key={s.name + s.index} d={s.d} className="nhood" data-nhood={s.name}
            style={{ fill: `var(--land-${(s.index % 5) + 1})` }} />
        ))}
      </g>
      <g className="nhood-labels" aria-hidden>
        {shapes.map((s) => (
          <text key={s.name + s.index} x={s.cx} y={s.cy} textAnchor="middle" className="nhood-label">{s.name}</text>
        ))}
      </g>
    </g>
  );
}

const Neighborhoods = memo(NeighborhoodsImpl);
export default Neighborhoods;
