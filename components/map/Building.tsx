'use client';
// A building (SPEC §9.3). Base at (0,0). Teal windows = windowsTeal(pct) of 20, filled from the bottom; the rest lit.
import { memo, useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { BuildingDef } from '@/lib/types';
import { buildingHeight } from '@/lib/layout';

export interface BuildingProps {
  index: number;
  def: BuildingDef;
  x: number;
  y: number;
  built: boolean;
  teal: number;             // teal windows, 0..20
  dim: boolean;
  selected: boolean;
  label: string;
  notBuiltTag: string;
  onActivate(index: number): void;
}

export const BUILDING_W = 22;
export { buildingHeight };

function BuildingImpl(p: BuildingProps) {
  // crane while growing, dust while shrinking (whimsy; CSS turns it off under reduced motion)
  const [prevBuilt, setPrevBuilt] = useState(p.built);
  const [fx, setFx] = useState<{ kind: 'grow' | 'shrink'; n: number } | null>(null);
  if (prevBuilt !== p.built) {
    setPrevBuilt(p.built);
    setFx({ kind: p.built ? 'grow' : 'shrink', n: (fx?.n ?? 0) + 1 });
  }
  useEffect(() => {
    if (!fx) return;
    const t = setTimeout(() => setFx(null), 1100);
    return () => clearTimeout(t);
  }, [fx]);
  const h = buildingHeight(p.def.units);
  const w = BUILDING_W;
  const cols = 4, rows = 5;
  const padX = 3, padTop = 4, padBottom = 4;
  const cw = (w - padX * 2) / cols;
  const ch = (h - padTop - padBottom) / rows;
  const windows = [];
  for (let i = 0; i < cols * rows; i++) {
    // i = 0 is bottom-left; fill bottom rows first
    const r = rows - 1 - Math.floor(i / cols);
    const c = i % cols;
    windows.push(
      <rect
        key={i}
        className={i < p.teal ? 'win teal' : 'win lit'}
        data-window={i < p.teal ? 'teal' : 'lit'}
        style={{ '--wi': i } as CSSProperties}
        x={-w / 2 + padX + c * cw + 0.8}
        y={-h + padTop + r * ch + 0.8}
        width={cw - 1.6}
        height={ch - 1.6}
      />,
    );
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.onActivate(p.index); }
  };
  return (
    <g
      className={`building${p.built ? ' built' : ' not-built'}${p.dim ? ' dim' : ''}${p.selected ? ' selected' : ''}`}
      data-building-index={p.index}
      data-built={p.built ? 'true' : 'false'}
      data-teal={p.built ? p.teal : 0}
      style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
      role="button"
      tabIndex={0}
      aria-label={p.label}
      onClick={(e) => { e.stopPropagation(); p.onActivate(p.index); }}
      onKeyDown={onKey}
    >
      <g className="fs">
      <rect className="hit" x={-w / 2 - 3} y={-h - 4} width={w + 6} height={h + 8} fill="transparent" />
      <rect className="focus-ring" x={-w / 2 - 5} y={-h - 7} width={w + 10} height={h + 11} rx={4} />
      <ellipse className="building-shadow" cx={2} cy={0.5} rx={w / 2 + 3} ry={2.2} />
      <rect className="ghost" x={-w / 2} y={-h} width={w} height={h} rx={1.5} />
      <g className="solid">
        <rect className="facade" x={-w / 2} y={-h} width={w} height={h} rx={1.5} />
        <rect className="roof" x={-w / 2 - 1.5} y={-h - 2.5} width={w + 3} height={3} rx={1} />
        {windows}
      </g>
      {fx?.kind === 'grow' && (
        <g key={`c${fx.n}`} className="crane" aria-hidden>
          <path d={`M${w / 2 + 4},0 L${w / 2 + 4},${-h - 12} M${w / 2 - 14},${-h - 10} L${w / 2 + 14},${-h - 10} M${w / 2 + 4},${-h - 12} L${w / 2 + 12},${-h - 10} M${w / 2 - 10},${-h - 10} L${w / 2 - 10},${-h - 2}`} />
          <rect x={w / 2 - 12.5} y={-h - 2} width={5} height={3} />
        </g>
      )}
      {fx?.kind === 'shrink' && (
        <g key={`d${fx.n}`} className="dust" aria-hidden>
          <circle cx={-9} cy={-3} r={4} /><circle cx={0} cy={-5} r={5} /><circle cx={9} cy={-3} r={4} />
        </g>
      )}
      <g className="nb-tag" transform={`translate(0,${-h - 9})`} aria-hidden>
        <rect x={-30} y={-9} width={60} height={13} rx={6.5} />
        <text x={0} y={1.5} textAnchor="middle">{p.notBuiltTag}</text>
      </g>
      </g>
    </g>
  );
}

const Building = memo(BuildingImpl);
export default Building;
