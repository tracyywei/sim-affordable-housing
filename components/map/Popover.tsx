'use client';
// Popover anchored to a figure (SPEC §9.4). All text comes from lib/copy.ts via the caller.
import type { ReactNode } from 'react';

export interface PopoverProps {
  x: number;                 // screen anchor (top of the figure)
  y: number;
  variant: 'persona' | 'woman' | 'building';
  title: string;
  lines: string[];
  closeLabel: string;
  onClose(): void;
  children?: ReactNode;
}

export default function Popover({ x, y, variant, title, lines, closeLabel, onClose }: PopoverProps) {
  return (
    <div
      className={`map-popover card ${variant}${y < 300 ? ' below' : ''}`}
      role="dialog"
      aria-label={title}
      data-popover={variant}
      style={{ left: x, top: y < 300 ? y + 40 : y }}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="map-popover-head">
        <div className="map-popover-title">{title}</div>
        <button type="button" className="map-popover-close" aria-label={closeLabel} onClick={onClose}>✕</button>
      </div>
      {lines.map((l, i) => <p key={i}>{l}</p>)}
      <span className="map-popover-pointer" aria-hidden />
    </div>
  );
}
