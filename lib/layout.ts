// Seeded figure placement + lineup positions (owner: Agent D). SPEC §9.1, §9.3, §9.5.
import { geoArea, geoMercator, geoPath, type GeoProjection } from 'd3-geo';
import type { Feature, Geometry, Position } from 'geojson';
import type { BuildingDef, NeighborhoodsGeo, PersonasFile, Status, Woman } from './types';
import { STATUSES } from './types';

/* ------------------------------------------------------------------ seeded rng */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ geo helpers */

/** Property name of a neighborhood feature (DataSF uses `nhood`). */
export function nhoodName(f: Feature<Geometry, Record<string, unknown>>): string {
  const p = f.properties ?? {};
  const v = p.nhood ?? p.name ?? p.NHOOD ?? p.Name ?? p.neighborhood ?? '';
  return String(v);
}

/** Parks/open space: no figures get placed here (SPEC §9.3). */
export const NON_RESIDENTIAL = new Set(['Golden Gate Park', 'Presidio', 'Lincoln Park', 'McLaren Park']);

/** d3-geo wants clockwise exterior rings; RFC 7946 files are counter-clockwise. Flip any feature that covers > half the globe. */
export function rewindGeo(geo: NeighborhoodsGeo): NeighborhoodsGeo {
  return {
    ...geo,
    features: geo.features.map((f) => {
      if (!f.geometry || geoArea(f) <= 2 * Math.PI) return f;
      const g = f.geometry;
      const rev = (rings: Position[][]) => rings.map((r) => [...r].reverse());
      if (g.type === 'Polygon') return { ...f, geometry: { ...g, coordinates: rev(g.coordinates) } };
      if (g.type === 'MultiPolygon') return { ...f, geometry: { ...g, coordinates: g.coordinates.map(rev) } };
      return f;
    }),
  };
}

/** Hand-made placeholder neighborhoods (boxes around approximate centers) used while the real geojson is missing. */
const PLACEHOLDER: [string, number, number, number, number][] = [
  // name, lon, lat, half-width (deg lon), half-height (deg lat)
  ['Presidio', -122.466, 37.798, 0.016, 0.006],
  ['Marina', -122.437, 37.801, 0.012, 0.005],
  ['Russian Hill', -122.418, 37.800, 0.007, 0.005],
  ['North Beach', -122.407, 37.803, 0.005, 0.004],
  ['Outer Richmond', -122.494, 37.778, 0.014, 0.006],
  ['Inner Richmond', -122.466, 37.780, 0.012, 0.006],
  ['Golden Gate Park', -122.483, 37.769, 0.028, 0.0035],
  ['Sunset/Parkside', -122.494, 37.749, 0.016, 0.0135],
  ['Inner Sunset', -122.464, 37.756, 0.012, 0.0085],
  ['Lakeshore', -122.488, 37.724, 0.018, 0.0105],
  ['West of Twin Peaks', -122.459, 37.735, 0.012, 0.0085],
  ['Western Addition', -122.433, 37.781, 0.010, 0.005],
  ['Hayes Valley', -122.426, 37.773, 0.006, 0.0035],
  ['Tenderloin', -122.414, 37.784, 0.004, 0.0035],
  ['Financial District/South Beach', -122.397, 37.792, 0.008, 0.007],
  ['South of Market', -122.405, 37.777, 0.009, 0.0065],
  ['Mission Bay', -122.390, 37.771, 0.006, 0.0055],
  ['Castro/Upper Market', -122.437, 37.761, 0.008, 0.007],
  ['Mission', -122.417, 37.759, 0.0085, 0.0085],
  ['Potrero Hill', -122.399, 37.759, 0.0085, 0.0075],
  ['Noe Valley', -122.434, 37.746, 0.008, 0.0055],
  ['Bernal Heights', -122.416, 37.740, 0.009, 0.0055],
  ['Bayview Hunters Point', -122.387, 37.731, 0.012, 0.0145],
  ['Outer Mission', -122.448, 37.719, 0.01, 0.0075],
  ['Excelsior', -122.428, 37.723, 0.0095, 0.0065],
  ['McLaren Park', -122.420, 37.714, 0.0075, 0.0035],
  ['Visitacion Valley', -122.407, 37.713, 0.0085, 0.0055],
  ['Treasure Island', -122.370, 37.823, 0.006, 0.007],
];

export function placeholderGeo(): NeighborhoodsGeo {
  return {
    type: 'FeatureCollection',
    features: PLACEHOLDER.map(([name, lon, lat, w, h]) => ({
      type: 'Feature',
      properties: { nhood: name, placeholder: true },
      geometry: {
        type: 'Polygon',
        // clockwise for d3-geo
        coordinates: [[[lon - w, lat - h], [lon - w, lat + h], [lon + w, lat + h], [lon + w, lat - h], [lon - w, lat - h]]],
      },
    })),
  };
}

/* ------------------------------------------------------------------ layout */

export interface Pt { x: number; y: number; }
export interface WomanSpot extends Pt { hair: 0 | 1 | 2; height: number; bobDelay: number; }
export interface NhoodShape { name: string; d: string; index: number; cx: number; cy: number; residential: boolean; }

export interface MapLayout {
  width: number;
  height: number;
  projection: GeoProjection;
  neighborhoods: NhoodShape[];
  women: Record<string, WomanSpot>;
  buildings: Pt[];             // index = BUILDINGS index
  missing: string[];           // neighborhood names not found in the geojson
  placeholder: boolean;
}

type Ring = [number, number][];

function inRings(rings: Ring[], x: number, y: number): boolean {
  // even-odd over all rings (handles holes and multipolygons)
  let inside = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i];
      const [xj, yj] = r[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function projectRings(g: Geometry, proj: GeoProjection): Ring[] {
  const out: Ring[] = [];
  const add = (ring: Position[]) => out.push(ring.map((p) => (proj([p[0], p[1]]) ?? [NaN, NaN]) as [number, number]));
  if (g.type === 'Polygon') g.coordinates.forEach(add);
  else if (g.type === 'MultiPolygon') g.coordinates.forEach((poly) => poly.forEach(add));
  return out;
}

interface Region { name: string; rings: Ring[]; x0: number; y0: number; x1: number; y1: number; area: number; residential: boolean; }

export const FIT_PAD = { left: 24, top: 120, right: 340, bottom: 180 };
export const WOMAN_MIN_DIST = 14;

export function computeLayout(
  geoIn: NeighborhoodsGeo | null,
  women: Woman[],
  personas: PersonasFile,
  buildings: BuildingDef[],
  width: number,
  height: number,
): MapLayout {
  const placeholder = !geoIn || !geoIn.features?.length;
  const geo = rewindGeo(placeholder ? placeholderGeo() : geoIn!);
  const projection = geoMercator().fitExtent(
    [[FIT_PAD.left, FIT_PAD.top], [Math.max(FIT_PAD.left + 50, width - FIT_PAD.right), Math.max(FIT_PAD.top + 50, height - FIT_PAD.bottom)]],
    geo,
  );
  const path = geoPath(projection);

  const neighborhoods: NhoodShape[] = [];
  const regions = new Map<string, Region>();
  geo.features.forEach((f, index) => {
    if (!f.geometry) return;
    const name = nhoodName(f);
    const [[x0, y0], [x1, y1]] = path.bounds(f);
    const [cx, cy] = path.centroid(f);
    const residential = !NON_RESIDENTIAL.has(name);
    neighborhoods.push({ name, d: path(f) ?? '', index, cx, cy, residential });
    regions.set(name, { name, rings: projectRings(f.geometry, projection), x0, y0, x1, y1, area: path.area(f), residential });
  });

  const rand = mulberry32(20260611);
  const missing: string[] = [];
  const taken: { x: number; y: number; r: number }[] = [];
  const free = (x: number, y: number, r: number) => taken.every((t) => (t.x - x) ** 2 + (t.y - y) ** 2 >= Math.max(t.r, r) ** 2);
  const residentialRegions = [...regions.values()].filter((r) => r.residential && r.area > 0);
  const totalArea = residentialRegions.reduce((s, r) => s + r.area, 0);

  const pickRegion = (): Region => {
    let u = rand() * totalArea;
    for (const r of residentialRegions) { u -= r.area; if (u <= 0) return r; }
    return residentialRegions[residentialRegions.length - 1];
  };
  const sampleIn = (reg: Region | undefined, r: number, tries = 400): Pt => {
    for (let i = 0; i < tries; i++) {
      const g = reg ?? pickRegion();
      const x = g.x0 + rand() * (g.x1 - g.x0);
      const y = g.y0 + rand() * (g.y1 - g.y0);
      if (inRings(g.rings, x, y) && free(x, y, r)) return { x, y };
    }
    // relax spacing rather than fail
    for (let i = 0; i < tries; i++) {
      const g = reg ?? pickRegion();
      const x = g.x0 + rand() * (g.x1 - g.x0);
      const y = g.y0 + rand() * (g.y1 - g.y0);
      if (inRings(g.rings, x, y)) return { x, y };
    }
    const g = reg ?? pickRegion();
    return { x: (g.x0 + g.x1) / 2, y: (g.y0 + g.y1) / 2 };
  };
  const regionFor = (name: string): Region | undefined => {
    const r = regions.get(name);
    if (!r && !missing.includes(name)) missing.push(name);
    return r;
  };

  // 1. buildings (SPEC §4.1 neighborhoods): centroid if it fits, else a seeded spot inside
  const bPts: Pt[] = buildings.map((b) => {
    const reg = regionFor(b.neighborhood);
    let pt: Pt;
    const c = reg ? { x: (reg.x0 + reg.x1) / 2, y: (reg.y0 + reg.y1) / 2 } : null;
    if (reg && c && inRings(reg.rings, c.x, c.y) && free(c.x, c.y, 34)) pt = c;
    else pt = sampleIn(reg, 34);
    taken.push({ ...pt, r: 34 });
    return pt;
  });

  // 2. personas pinned in their neighborhoods (SPEC §5.5)
  const spots: Record<string, WomanSpot> = {};
  const deco = (): Omit<WomanSpot, 'x' | 'y'> => ({
    hair: Math.floor(rand() * 3) as 0 | 1 | 2,
    height: 0.9 + rand() * 0.2,
    bobDelay: rand() * 3,
  });
  for (const p of Object.values(personas)) {
    const pt = sampleIn(regionFor(p.neighborhood), 22);
    taken.push({ ...pt, r: 22 });
    spots[p.id] = { ...pt, ...deco() };
  }

  // 3. everyone else: rejection sampling across residential neighborhoods, >= 14 px apart
  for (const w of women) {
    if (spots[w.id]) continue;
    const pt = sampleIn(undefined, WOMAN_MIN_DIST);
    taken.push({ ...pt, r: WOMAN_MIN_DIST });
    spots[w.id] = { ...pt, ...deco() };
  }

  return { width, height, projection, neighborhoods, women: spots, buildings: bPts, missing, placeholder };
}

/* ------------------------------------------------------------------ lineup */

export interface LineupBlock { status: Status; x: number; y: number; w: number; h: number; count: number; }
export interface Lineup { spots: Record<string, Pt>; blocks: LineupBlock[]; }

export const LINEUP_DX = 17;
export const LINEUP_DY = 26;

/** Three blocks (too_much, too_little, qualifies) side by side in the middle of the map area. */
export function computeLineup(women: Woman[], width: number, height: number): Lineup {
  const x0 = FIT_PAD.left, x1 = Math.max(x0 + 300, width - FIT_PAD.right);
  const y0 = FIT_PAD.top, y1 = Math.max(y0 + 200, height - FIT_PAD.bottom);
  const groups = STATUSES.map((s) => women.filter((w) => w.status === s));
  const cols = 8;
  const gap = Math.max(40, Math.min(110, ((x1 - x0) - 3 * cols * LINEUP_DX) / 4));
  const blockW = cols * LINEUP_DX;
  const totalW = 3 * blockW + 2 * gap;
  const maxRows = Math.max(1, ...groups.map((g) => Math.ceil(g.length / cols)));
  const blockH = maxRows * LINEUP_DY;
  const left = (x0 + x1) / 2 - totalW / 2;
  // leave room above for the big count + label, below for the odds line
  const top = Math.max(y0 + 90, (y0 + y1) / 2 - blockH / 2 + 20);
  const spots: Record<string, Pt> = {};
  const blocks: LineupBlock[] = groups.map((g, gi) => {
    const bx = left + gi * (blockW + gap);
    g.forEach((w, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      // feet at y; figures are ~18 px tall
      spots[w.id] = { x: bx + c * LINEUP_DX + LINEUP_DX / 2, y: top + r * LINEUP_DY + 18 };
    });
    return { status: STATUSES[gi], x: bx, y: top, w: blockW, h: blockH, count: g.length };
  });
  return { spots, blocks };
}
