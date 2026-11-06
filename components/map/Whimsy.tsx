'use client';
// Map life (SPEC §9.2): fog, waves, Golden Gate doodle. Decorative only: aria-hidden, no pointer events,
// all motion off under prefers-reduced-motion (CSS). Never touches outcomes.
import { memo } from 'react';
import type { MapLayout } from '@/lib/layout';

const WAVES: [number, number][] = [
  [-122.372, 37.795], [-122.365, 37.752], [-122.37, 37.72], [-122.522, 37.765], [-122.524, 37.735],
  [-122.445, 37.818], [-122.405, 37.815], [-122.513, 37.79],
];
const BRIDGE: [number, number] = [-122.4775, 37.8135];   // Golden Gate strait, just off the north edge

function WhimsyImpl({ layout }: { layout: MapLayout }) {
  const proj = layout.projection;
  const p = (ll: [number, number]) => proj(ll) ?? [0, 0];
  const fogAnchors = layout.neighborhoods.filter((n) => ['Sunset/Parkside', 'Outer Richmond', 'Inner Sunset'].includes(n.name));
  const br = p(BRIDGE);
  const blen = 44;
  return (
    <g className="whimsy" aria-hidden>
      <g className="waves">
        {WAVES.map((ll, i) => {
          const [x, y] = p(ll);
          return <path key={i} className="wave" style={{ animationDelay: `${-i * 0.7}s` }}
            d={`M${x - 9},${y} q2.25,-3 4.5,0 t4.5,0 t4.5,0 t4.5,0`} />;
        })}
      </g>
      <g className="bridge" transform={`translate(${br[0] - blen / 2},${br[1]})`}>
        <path d={`M0,0 L${blen},0`} className="deck" />
        <path d={`M${blen * 0.22},0 L${blen * 0.22},-12 M${blen * 0.78},0 L${blen * 0.78},-12`} className="tower" />
        <path d={`M0,-1 Q${blen * 0.11},-3 ${blen * 0.22},-12 Q${blen * 0.5},0 ${blen * 0.78},-12 Q${blen * 0.89},-3 ${blen},-1`} className="cable" />
      </g>
      <g className="fog">
        {fogAnchors.map((n, i) => (
          <g key={n.name} className="fog-blob" style={{ animationDelay: `${-i * 13}s` }}>
            <ellipse cx={n.cx - 10} cy={n.cy - 6} rx={34} ry={11} />
            <ellipse cx={n.cx + 14} cy={n.cy + 2} rx={26} ry={9} />
          </g>
        ))}
      </g>
    </g>
  );
}

const Whimsy = memo(WhimsyImpl);
export default Whimsy;
