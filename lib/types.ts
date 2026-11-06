// ★ THE CONTRACT. Every agent reads this before writing code.
// Shapes match what build_data.py actually writes (SPEC §6 adjusted; see BUILD-PROMPT "Known gaps" 1).
// Change this file only through the lead.

import type { FeatureCollection, Geometry } from 'geojson';

/* ------------------------------------------------------------------ data files */

export type Status = 'too_much' | 'too_little' | 'qualifies';
export const STATUSES: Status[] = ['too_much', 'too_little', 'qualifies'];

export type PersonaName = 'Linh' | 'Rosa' | 'Ana' | 'Priya';
export const PERSONA_NAMES: PersonaName[] = ['Linh', 'Rosa', 'Ana', 'Priya'];

/** One record of public/data/women100.json (a real anonymized PUMS householder). */
export interface Woman {
  id: string;                 // "w0".."w99"
  serial: string | null;      // PUMS SERIALNO
  size: number;               // people in household (1..)
  kids: number;
  income: number;             // annual $, inflation-adjusted
  age: number;                // householder age
  rentMonthly: number | null; // gross rent $/month
  rentShare: number | null;   // rent*12/income, e.g. 0.553
  status: Status;
  gap: boolean;               // too_much AND rentShare >= 0.30
  occp: string | null;        // PUMS occupation code (unused on screen)
  persona: PersonaName | null;
  homeBedrooms: number;       // 0 = studio, 1, 2, 3
  limit: number;              // max income for her household size
  floor: number;              // min income for her home size
}

/** One entry of public/data/personas.json = a Woman + display fields. */
export interface Persona extends Woman {
  persona: PersonaName;
  neighborhood: string;       // exact property value in sf-neighborhoods.geojson
  job: string;                // invented label (SPEC §5.5)
}
export type PersonasFile = Record<PersonaName, Persona>;

/** public/data/meta.json. Python dict keys become strings in JSON. */
export interface Meta {
  counts: Record<Status, number>;      // sums to 100
  gapCount: number;
  qualifiers: number;                  // weighted count of ALL SF renter households that qualify
  womenShareOfQualifiers: number;      // 0..1
  rent: Record<string, number>;        // "0".."3" bedrooms -> $/month (rounded)
  floor: Record<string, number>;       // "0".."3" bedrooms -> min income
  limit: Record<string, number>;       // "1".."8" people -> max income
  forScale: { affordableHomes: number; year: number } | null; // SPEC §4.4
  synthetic?: boolean;                 // true only if the SPEC §7 PUMS fallback was used
}

/** data/validation.json rows (served to the drawer via import). */
export interface ValidationRow {
  stat: string;
  pums: number | null;
  acs: number | null;
  source: string;
  diffPts: number | null;
}

export type NeighborhoodsGeo = FeatureCollection<Geometry, Record<string, unknown>>;

/* ------------------------------------------------------------------ simulation */

export interface BuildingDef {
  id: number;                 // 1..20 (SPEC §4.1 order)
  breakEven: number;          // highest pct at which it still gets built; -1 = never
  units: number;
  name: string;               // made up
  neighborhood: string;       // exact geojson property value
}

export interface SliderResult {
  pct: number;                // 0..25
  buildingsBuilt: number;
  newHomes: number;
  affordableHomes: number;
  built: boolean[];           // index = building index in BUILDINGS (0..19)
  oddsN: number | null;       // qualifiers / affordableHomes, rounded; null when affordableHomes = 0
  womenHomes: number;         // round(affordableHomes * womenShareOfQualifiers)
}

export interface AppData {
  women: Woman[];
  personas: PersonasFile;
  meta: Meta;
  results: SliderResult[];    // index = pct 0..25
  sweetSpot: number;          // pct with the most affordable homes (8)
  geo: NeighborhoodsGeo | null;
}

/* ------------------------------------------------------------------ app state (owned by app/page.tsx) */

export type Selection =
  | { kind: 'woman'; id: string }        // includes personas (by woman id)
  | { kind: 'building'; index: number }  // 0..19
  | null;

export type ExplainSource = 'claude' | 'cache' | 'template';
export interface ExplainState {
  open: boolean;
  loading: boolean;
  text: string;               // template immediately, then Claude's text
  source: ExplainSource;
  forPct: number;
}

export interface AppState {
  pct: number;                // default 10
  selected: Selection;
  lineup: boolean;
  explain: ExplainState;
  drawerOpen: boolean;
  hasDragged: boolean;        // hides "drag me!"
}

/* ------------------------------------------------------------------ /api/explain */

export interface ExplainRequest {
  pct: number;
  result: SliderResult;
  baseline: SliderResult;     // the result at 10%
  counts: Record<Status, number>;
  gapCount: number;
}
export interface ExplainResponse { text: string; source: ExplainSource; }

/* ------------------------------------------------------------------ component props */

/** Imperative camera handle exposed by <SfMap> via ref. */
export interface CameraHandle {
  zoomIn(): void;
  zoomOut(): void;
  reset(): void;
  flyToWoman(id: string): void;
  flyToBuilding(index: number): void;
}

export interface SfMapProps {
  data: AppData;
  pct: number;
  selected: Selection;
  lineup: boolean;
  reducedMotion: boolean;
  onSelect(sel: Selection): void;       // null = close popover (Esc / ⟲ / ✕)
}

export interface TitleBlockProps { onOpenInfo(): void; }
export interface ZoomControlsProps { onZoomIn(): void; onZoomOut(): void; onReset(): void; }

export interface ControlBarProps {
  pct: number;
  onChange(pct: number): void;
  onExplain(): void;
  explainLoading: boolean;
  hasDragged: boolean;
}

export interface ScoreboardsProps {
  result: SliderResult;
  baseline: SliderResult;     // 10%
  total: number;              // 20 buildings proposed
}

export interface AffordableCardProps {
  meta: Meta;
  persona: Persona | null;    // tick on the income bar (default Linh)
}

export interface LegendProps {
  counts: Record<Status, number>;
  gapCount: number;
  result: SliderResult;
  lineup: boolean;
  onToggleLineup(): void;
  personas: PersonasFile;
  onPersona(name: PersonaName): void;
}

export interface PersonaChipsProps {
  personas: PersonasFile;
  onPersona(name: PersonaName): void;
}

export interface ClaudeBubbleProps {
  explain: ExplainState;
  onClose(): void;
}

export interface InfoDrawerProps {
  open: boolean;
  onClose(): void;
  meta: Meta;
  validation: ValidationRow[];
}
