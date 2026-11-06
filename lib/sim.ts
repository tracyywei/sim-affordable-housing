// Owner: Agent B. Layer 1 simulation (SPEC §4.2) + odds (SPEC §5.3). precompute(raw) -> AppData.
import type { AppData, Meta, SliderResult } from './types';
import type { RawData } from './data';
import { BUILDINGS, MAX_PCT, affordableUnits } from './constants';

/** One slider position. */
export function run(pct: number, meta: Meta): SliderResult {
  const built = BUILDINGS.map((b) => b.breakEven >= pct);
  let buildingsBuilt = 0;
  let newHomes = 0;
  let affordableHomes = 0;
  BUILDINGS.forEach((b, i) => {
    if (!built[i]) return;
    buildingsBuilt += 1;
    newHomes += b.units;
    affordableHomes += affordableUnits(b.units, pct);
  });
  return {
    pct,
    buildingsBuilt,
    newHomes,
    affordableHomes,
    built,
    oddsN: affordableHomes > 0 ? Math.round(meta.qualifiers / affordableHomes) : null,
    womenHomes: Math.round(affordableHomes * meta.womenShareOfQualifiers),
  };
}

/** 26 results, index = pct 0..25. */
export function computeResults(meta: Meta): SliderResult[] {
  return Array.from({ length: MAX_PCT + 1 }, (_, pct) => run(pct, meta));
}

/** pct with the most affordable homes (first one on ties). */
export function sweetSpotOf(results: SliderResult[]): number {
  let best = 0;
  for (const r of results) if (r.affordableHomes > results[best].affordableHomes) best = r.pct;
  return best;
}

export function precompute(raw: RawData): AppData {
  const results = computeResults(raw.meta);
  return {
    women: raw.women,
    personas: raw.personas,
    meta: raw.meta,
    geo: raw.geo,
    results,
    sweetSpot: sweetSpotOf(results),
  };
}
