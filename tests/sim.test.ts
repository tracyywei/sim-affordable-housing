// Owner: Agent B. SPEC §11 tests 1-5 + TS/Python formula cross-check against meta.json.
import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  BUILDINGS, F, MAX_PCT, TOTAL_BUILDINGS, floor, homeBedrooms, limit, pyRound, rent, rentRounded, round50, windowsTeal,
} from '@/lib/constants';
import { computeResults, precompute, run } from '@/lib/sim';
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

  test(`4. women100.json status counts sum to 100, match meta.counts, and agree with TS limit/floor (${path.basename(path.dirname(womenFile))})`, () => {
    expect(women.length).toBe(100);
    const counts: Record<Status, number> = { too_much: 0, too_little: 0, qualifies: 0 };
    for (const w of women) counts[w.status] += 1;
    expect(counts.too_much + counts.too_little + counts.qualifies).toBe(100);
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
    expect(windowsTeal(10)).toBe(2);
    expect(windowsTeal(25)).toBe(5);
  });
});
