'use client';
// A building (SPEC §9.3). Base at (0,0). Teal windows = windowsTeal(pct) of 20, filled from the bottom; the rest lit.
import { memo, type KeyboardEvent } from 'react';
import type { BuildingDef } from '@/lib/types';

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
export function buildingHeight(units: number): number {
  return units < 75 ? 28 : units > 175 ? 54 : 40;
}

function BuildingImpl(p: BuildingProps) {
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
