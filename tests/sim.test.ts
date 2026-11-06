// Owner: Agent B. SPEC §11 tests 1-5 + TS/Python formula cross-check against meta.json.
import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  BUILDINGS, F, MAX_PCT, TOTAL_BUILDINGS, floor, homeBedrooms, limit, pyRound, rent, rentRounded, round50, windowsTeal, windowCount, affordableUnits,
} from '@/lib/constants';
import { computeResults, precompute, run } from '@/lib/sim';
import { buildingHeight } from '@/lib/layout';
import type { Meta, Status, Woman } from '@/lib/types';

/** Real data file if the pipeline has produced it, else the fixture. */
function dataFile(name: string): { file: string; json: unknown } {
  const real = path.resolve(__dirname, '../public/data', name);
  const fixture = path.resolve(__dirname, '../public/data/fixture', name);
  const file = fs.existsSync(real) ? real : fixture;
  return { file, json: JSON.parse(fs.readFileSync(file, 'utf8')) };
}
const { file: metaFile, json: metaJson } = dataFile('meta.json');
const meta = metaJson as Meta;
const { file: womenFile, json: womenJson } = dataFile('women100.json');
const women = womenJson as Woman[];
const results = computeResults(meta);
/** true while public/data/meta.json hasn't been produced yet (hand-made fixture). */
const isFixture = metaFile.includes(`${path.sep}fixture${path.sep}`);

describe('rounding (Python round = half to even)', () => {
  test('pyRound matches Python on halves', () => {
    expect([0.5, 1.5, 2.5, 3.5, -0.5, -1.5, 2.4, 2.6].map(pyRound)).toEqual([0, 2, 2, 4, 0, -2, 2, 3]);
  });
  test('round50 rounds exact $25 midpoints to the even multiple of $50', () => {
    expect(round50(25)).toBe(0);
    expect(round50(75)).toBe(100);
    expect(round50(125)).toBe(100);
    expect(round50(90774)).toBe(90750);
    expect(round50(90776)).toBe(90800);
  });
});

describe('SPEC §11', () => {
  test('1. income limits reproduce MOHCD 2026', () => {
    expect([1, 2, 3, 4].map(limit)).toEqual([90750, 103750, 116700, 129700]);
    expect(F.length).toBe(9);
  });

  test('2. rent and floor: studio $2,269 / $54,450; 1BR $2,594 / $62,250', () => {
    expect(rentRounded(0)).toBe(2269);
    expect(floor(0)).toBe(54450);
    expect(rentRounded(1)).toBe(2594);
    expect(floor(1)).toBe(62250);
    // 3BR: 0.30 * 129,700 / 12 = 3242.5 exactly. Python round() -> 3242 (half to even), which is what
    // build_data.py writes to meta.json. SPEC §5.1 says $3,243 (half up); the code follows Python.
    expect(rent(3)).toBe(3242.5);
    expect([2, 3].map(rentRounded)).toEqual([2918, 3242]);
    expect([2, 3].map(floor)).toEqual([70000, 77800]);
  });

  test('3. the §4.3 table (contract)', () => {
    const table: [number, number, number, number][] = [
      [0, 18, 2480, 0],
      [5, 17, 2280, 117],
      [8, 15, 1850, 148],
      [10, 13, 1400, 141],
      [15, 8, 430, 66],
      [20, 6, 240, 48],
      [25, 2, 85, 22],
    ];
    for (const [pct, built, homes, aff] of table) {
      const r = results[pct];
      expect([r.pct, r.buildingsBuilt, r.newHomes, r.affordableHomes], `pct ${pct}`).toEqual([pct, built, homes, aff]);
    }
    const max = Math.max(...results.map((r) => r.affordableHomes));
    expect(max).toBe(148);
    expect(results.filter((r) => r.affordableHomes === max).map((r) => r.pct)).toEqual([8]);
  });

  test(`4. women100.json status counts sum to women.length (N), match meta.counts, and agree with TS limit/floor (${path.basename(path.dirname(womenFile))})`, () => {
    // N = women.length (was 100; now ~740 at 1 figure = meta.scale households). Nothing assumes 100.
    expect(women.length).toBeGreaterThan(0);
    const counts: Record<Status, number> = { too_much: 0, too_little: 0, qualifies: 0 };
    for (const w of women) counts[w.status] += 1;
    expect(counts.too_much + counts.too_little + counts.qualifies).toBe(women.length);
    expect(meta.counts.too_much + meta.counts.too_little + meta.counts.qualifies).toBe(women.length);
    expect(new Set(women.map((w) => w.id)).size).toBe(women.length);
    expect(counts).toEqual(meta.counts);
    expect(women.filter((w) => w.gap).length).toBe(meta.gapCount);
    for (const w of women) {
      const br = homeBedrooms(w.size);
      const expected: Status = w.income > limit(w.size) ? 'too_much' : w.income < floor(br) ? 'too_little' : 'qualifies';
      expect(w.status, `${w.id} income ${w.income} size ${w.size}`).toBe(expected);
      expect([w.homeBedrooms, w.limit, w.floor], w.id).toEqual([br, limit(w.size), floor(br)]);
      // The hand-made fixture's gap flags don't follow the rule (w23 etc.); real data must.
      if (!isFixture) expect(w.gap, w.id).toBe(w.status === 'too_much' && (w.rentShare ?? 0) >= 0.3);
    }
  });

  test('5. buildings built never increases as % rises', () => {
    for (let p = 1; p <= MAX_PCT; p++) {
      expect(results[p].buildingsBuilt).toBeLessThanOrEqual(results[p - 1].buildingsBuilt);
      results[p].built.forEach((b, i) => { if (b) expect(results[p - 1].built[i]).toBe(true); });
    }
  });
});

test(`cross-check: TS limit/rent/floor equal ${path.relative(path.resolve(__dirname, '..'), metaFile)}`, () => {
  for (let size = 1; size <= 8; size++) expect(limit(size), `limit ${size}`).toBe(meta.limit[String(size)]);
  for (let br = 0; br <= 3; br++) {
    // The hand-made fixture has rent "3" = 3243 (SPEC's half-up value); Python writes 3242.
    if (!(isFixture && br === 3)) expect(rentRounded(br), `rent ${br}`).toBe(meta.rent[String(br)]);
    expect(floor(br), `floor ${br}`).toBe(meta.floor[String(br)]);
  }
  expect(rent(0)).toBeCloseTo(2268.75, 6); // unrounded, as in Python
});

describe('shape', () => {
  test('buildings, results, odds, sweet spot', () => {
    expect(BUILDINGS.length).toBe(TOTAL_BUILDINGS);
    expect(BUILDINGS.map((b) => b.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(results.length).toBe(26);
    results.forEach((r, i) => expect(r.pct).toBe(i));
    expect(results[0].oddsN).toBeNull();
    expect(results[0].womenHomes).toBe(0);
    for (const r of results.slice(1)) {
      expect(r.built.length).toBe(20);
      expect(r.oddsN).toBe(Math.round(meta.qualifiers / r.affordableHomes));
      expect(r.womenHomes).toBe(Math.round(r.affordableHomes * meta.womenShareOfQualifiers));
    }
    expect(run(10, meta)).toEqual(results[10]);
    const app = precompute({ women, personas: {} as never, meta, geo: null });
    expect(app.sweetSpot).toBe(8);
    expect(app.results).toEqual(results);
  });
});

describe('building windows scale with size', () => {
  const pcts = Array.from({ length: MAX_PCT + 1 }, (_, p) => p);

  test('one window per 10 apartments', () => {
    expect(windowCount(300)).toBe(30);
    expect(windowCount(120)).toBe(12);
    expect(windowCount(25)).toBe(3);
    expect(windowCount(1)).toBe(1);
  });

  test('teal windows follow each building\'s own affordable apartments', () => {
    // at 10%: 300 apts -> 30 affordable -> 3 teal; 25 apts -> 3 affordable -> 1 teal
    expect(windowsTeal(300, 10)).toBe(3);
    expect(windowsTeal(120, 10)).toBe(1);
    expect(windowsTeal(25, 10)).toBe(1);
    expect(windowsTeal(250, 25)).toBe(6);
    expect(windowsTeal(300, 0)).toBe(0);
    expect(new Set(BUILDINGS.map((b) => windowsTeal(b.units, 25))).size).toBeGreaterThan(1);
  });

  test('every building, every %: 0 only when nothing is affordable, never more than its windows', () => {
    for (const b of BUILDINGS) {
      for (const p of pcts) {
        const t = windowsTeal(b.units, p);
        expect(t === 0).toBe(affordableUnits(b.units, p) === 0);
        expect(t).toBeLessThanOrEqual(windowCount(b.units));
        if (p > 0) expect(t).toBeGreaterThanOrEqual(windowsTeal(b.units, p - 1));
      }
    }
  });

  test('bigger buildings are never shorter and never have fewer teal windows', () => {
    const bySize = [...BUILDINGS].sort((a, b) => a.units - b.units);
    for (let i = 1; i < bySize.length; i++) {
      expect(buildingHeight(bySize[i].units)).toBeGreaterThanOrEqual(buildingHeight(bySize[i - 1].units));
      for (const p of pcts) expect(windowsTeal(bySize[i].units, p)).toBeGreaterThanOrEqual(windowsTeal(bySize[i - 1].units, p));
    }
    expect(buildingHeight(300)).toBeGreaterThan(buildingHeight(25));
  });

  test('per-building affordable apartments add up to the scoreboard total', () => {
    for (const p of pcts) {
      const r = run(p, meta);
      const sum = BUILDINGS.reduce((s, b, i) => s + (r.built[i] ? affordableUnits(b.units, p) : 0), 0);
      expect(sum).toBe(r.affordableHomes);
    }
  });
});
