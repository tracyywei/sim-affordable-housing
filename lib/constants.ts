// Owner: Agent B. 20 buildings (SPEC §4.1), F factors and income/rent/floor formulas (SPEC §5.1).
// The formulas mirror build_data.py lines 105-111 exactly, including Python's round-half-to-even.
import type { BuildingDef } from './types';

export const START_PCT = 10;
export const MAX_PCT = 25;
export const TOTAL_BUILDINGS = 20;

/** SPEC §4.1, in order. breakEven -1 = never built. Neighborhood strings = geojson property values. */
export const BUILDINGS: BuildingDef[] = [
  { id: 1, breakEven: -1, units: 120, name: 'Lakeview Commons', neighborhood: 'Lakeshore' },
  { id: 2, breakEven: -1, units: 80, name: 'Ocean Ave Lofts', neighborhood: 'Outer Mission' },
  { id: 3, breakEven: 3, units: 200, name: 'Folsom Yards', neighborhood: 'South of Market' },
  { id: 4, breakEven: 5, units: 250, name: 'Channel Point', neighborhood: 'Mission Bay' },
  { id: 5, breakEven: 6, units: 180, name: 'Brannan Works', neighborhood: 'South of Market' },
  { id: 6, breakEven: 8, units: 300, name: 'Harbor Terrace', neighborhood: 'Financial District/South Beach' },
  { id: 7, breakEven: 9, units: 150, name: '18th St Flats', neighborhood: 'Mission' },
  { id: 8, breakEven: 10, units: 220, name: 'Market Octavia A', neighborhood: 'Hayes Valley' },
  { id: 9, breakEven: 11, units: 160, name: 'Third St Gardens', neighborhood: 'Bayview Hunters Point' },
  { id: 10, breakEven: 12, units: 260, name: 'Island Cove', neighborhood: 'Treasure Island' },
  { id: 11, breakEven: 13, units: 140, name: 'Potrero Rise', neighborhood: 'Potrero Hill' },
  { id: 12, breakEven: 14, units: 190, name: 'Van Ness Court', neighborhood: 'Western Addition' },
  { id: 13, breakEven: 16, units: 100, name: 'Geneva Place', neighborhood: 'Excelsior' },
  { id: 14, breakEven: 18, units: 90, name: 'Taraval Homes', neighborhood: 'Sunset/Parkside' },
  { id: 15, breakEven: 20, units: 40, name: 'Larkin Studios', neighborhood: 'Tenderloin' },
  { id: 16, breakEven: 21, units: 30, name: 'Mission Street A', neighborhood: 'Mission' },
  { id: 17, breakEven: 22, units: 60, name: 'Cortland Row', neighborhood: 'Bernal Heights' },
  { id: 18, breakEven: 24, units: 25, name: 'Clement Corner', neighborhood: 'Outer Richmond' },
  { id: 19, breakEven: 30, units: 35, name: 'Irving Walk', neighborhood: 'Inner Sunset' },
  { id: 20, breakEven: 40, units: 50, name: 'Bayshore Commons', neighborhood: 'Visitacion Valley' },
];

/** SF area median income, 4 people, MOHCD 2026 (100% AMI). */
export const AMI4 = 162100;
/** Household-size factors; index = people (1..8). F[0] unused. */
export const F: readonly number[] = [NaN, 0.7, 0.8, 0.9, 1.0, 1.08, 1.16, 1.24, 1.32];

/** Python's built-in round(x): nearest integer, exact halves go to the even neighbour. */
export function pyRound(x: number): number {
  const fl = Math.floor(x);
  const diff = x - fl;
  if (diff > 0.5) return fl + 1;
  if (diff < 0.5) return fl;
  return fl % 2 === 0 ? fl : fl + 1;
}

/** build_data.py r50: int(50 * round(x / 50)) — nearest $50, halves to even. */
export function round50(x: number): number {
  return 50 * pyRound(x / 50);
}

const clampSize = (size: number) => Math.min(Math.max(size, 1), 8);

/** Max income for a household of `size` people (80% AMI). MOHCD rounds the 100% figure first. */
export function limit(size: number): number {
  return round50(0.8 * round50(AMI4 * F[clampSize(size)]));
}

/** 1 person -> studio (0) · 2-3 -> 1BR · 4-5 -> 2BR · 6+ -> 3BR. */
export function homeBedrooms(size: number): number {
  return size <= 1 ? 0 : size <= 3 ? 1 : size <= 5 ? 2 : 3;
}

/** Capped monthly rent, unrounded (as in Python). Studio uses 1 person. */
export function rent(br: number): number {
  return (0.3 * limit(br + 1)) / 12;
}

/** Capped monthly rent rounded the way meta.json stores it (Python round()). */
export function rentRounded(br: number): number {
  return pyRound(rent(br));
}

/** Minimum income for a home with `br` bedrooms: rent may be at most half of income. */
export function floor(br: number): number {
  return round50(2 * 12 * rent(br));
}

/** Teal windows out of 20 on a built building (SPEC §4.2). */
export function windowsTeal(pct: number): number {
  return Math.round((20 * pct) / 100);
}
