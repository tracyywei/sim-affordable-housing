'use client';
// A small drawn person (SPEC §9.3), civic style: no per-figure animation (~740 figures).
// Feet at (0,0); `size` scales the drawing (1 = ~18 px tall). Counter-scaled via the --fs CSS var set by the camera.
import { memo, type KeyboardEvent } from 'react';
import type { PersonaName, Status } from '@/lib/types';

export interface PersonProps {
  id: string;
  x: number;
  y: number;
  status: Status;
  persona: PersonaName | null;
  hair: 0 | 1 | 2;
  height: number;
  size: number;
  delayMs: number;          // lineup walk stagger
  dim: boolean;
  selected: boolean;
  label: string;            // aria-label (personas only)
  onActivate(id: string): void;
  onHover(id: string | null): void;
}

const STATUS_VAR: Record<Status, string> = {
  too_much: 'var(--too-much)',
  too_little: 'var(--too-little)',
  qualifies: 'var(--qualifies)',
};

function Hair({ kind }: { kind: 0 | 1 | 2 }) {
  if (kind === 0) return <circle cx={0} cy={-18.6} r={1.7} fill="var(--ink)" />;
  if (kind === 1) return <path d="M-3.6,-14.6 Q-3.8,-19 0,-18.4 Q3.8,-19 3.6,-14.6 L3.9,-10.8 L2.4,-11.6 L2.6,-15.4 L-2.6,-15.4 L-2.4,-11.6 L-3.9,-10.8 Z" fill="var(--ink)" />;
  return <path d="M-3.3,-15 A3.3,3.3 0 0 1 3.3,-15 Q0,-16.6 -3.3,-15 Z" fill="var(--ink)" />;
}

function PersonImpl(p: PersonProps) {
  const isPersona = p.persona != null;
  const s = p.size * p.height;
  const ringR = Math.max(8, 12 * p.size);
  const ringCy = -9 * p.size;
  const tagY = ringCy - ringR - 7;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.onActivate(p.id); }
  };
  return (
    <g
      className={`person${p.dim ? ' dim' : ''}${p.selected ? ' selected' : ''}${isPersona ? ' is-persona' : ''}`}
      data-figure="woman"
      data-status={p.status}
      data-id={p.id}
      data-persona={p.persona ?? undefined}
      style={{ transform: `translate(${p.x}px, ${p.y}px)`, transitionDelay: p.delayMs ? `${p.delayMs}ms` : undefined }}
      role={isPersona ? 'button' : undefined}
      tabIndex={isPersona ? 0 : undefined}
      aria-label={isPersona ? p.label : undefined}
      aria-hidden={isPersona ? undefined : true}
      onClick={(e) => { e.stopPropagation(); p.onActivate(p.id); }}
      onKeyDown={isPersona ? onKey : undefined}
      onMouseEnter={() => p.onHover(p.id)}
      onMouseLeave={() => p.onHover(null)}
      onFocus={isPersona ? () => p.onHover(p.id) : undefined}
      onBlur={isPersona ? () => p.onHover(null) : undefined}
    >
      <g className="fs">
        {isPersona && <circle className="persona-ring" cx={0} cy={ringCy} r={ringR} />}
        {isPersona && <circle className="focus-ring" cx={0} cy={ringCy} r={ringR + 3} />}
        <g className="person-fig" transform={`scale(${s})`}>
          <rect className="hit" x={-7} y={-21} width={14} height={23} fill="transparent" />
          <line x1={-1.7} y1={-3} x2={-1.9} y2={0} className="leg" />
          <line x1={1.7} y1={-3} x2={1.9} y2={0} className="leg" />
          <rect x={-3.5} y={-11.6} width={7} height={9} rx={1.6} fill={STATUS_VAR[p.status]} className="body" />
          {p.hair === 1 && <Hair kind={1} />}
          <circle cx={0} cy={-14.9} r={3.2} className="head" />
          {p.hair !== 1 && <Hair kind={p.hair} />}
        </g>
        {isPersona && (
          <g className="persona-tag" transform={`translate(0,${tagY})`}>
            <rect x={-(p.persona!.length * 3.6 + 6)} y={-8} width={p.persona!.length * 7.2 + 12} height={13} rx={6.5} />
            <text x={0} y={2.2} textAnchor="middle">{p.persona}</text>
          </g>
        )}
      </g>
    </g>
  );
}

const Person = memo(PersonImpl);
export default Person;
