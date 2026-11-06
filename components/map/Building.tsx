'use client';
// A building (SPEC §9.3). Base at (0,0). One window per UNITS_PER_WINDOW apartments, so size shows on the
// facade; teal windows = windowsTeal(units, pct), filled from the bottom; the rest lit.
import { memo, type CSSProperties, type KeyboardEvent } from 'react';
import type { BuildingDef } from '@/lib/types';
import { windowCount } from '@/lib/constants';
import { BUILDING_PAD_BOTTOM, WINDOW_COLS, WINDOW_ROW_H, buildingHeight } from '@/lib/layout';

export interface BuildingProps {
  index: number;
  def: BuildingDef;
  x: number;
  y: number;
  built: boolean;
  teal: number;             // teal windows for this building, 0..windowCount(def.units)
  dim: boolean;
  selected: boolean;
  label: string;
  notBuiltTag: string;
  onActivate(index: number): void;
}

export const BUILDING_W = 22;
export { buildingHeight };

function BuildingImpl(p: BuildingProps) {
  const h = buildingHeight(p.def.units);
  const w = BUILDING_W;
  const cols = WINDOW_COLS;
  const count = windowCount(p.def.units);
  const padX = 3;
  const cw = (w - padX * 2) / cols;
  const ch = WINDOW_ROW_H;
  const windows = [];
  for (let i = 0; i < count; i++) {
    // i = 0 is bottom-left; fill bottom floors first. A partly filled top floor is centered.
    const floor = Math.floor(i / cols);
    const inFloor = Math.min(cols, count - floor * cols);
    const c = (i % cols) + (cols - inFloor) / 2;
    const y = -BUILDING_PAD_BOTTOM - (floor + 1) * ch;
    windows.push(
      <rect
        key={i}
        className={i < p.teal ? 'win teal' : 'win lit'}
        data-window={i < p.teal ? 'teal' : 'lit'}
        style={{ '--wi': i } as CSSProperties}
        x={-w / 2 + padX + c * cw + 0.8}
        y={y + 0.8}
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
