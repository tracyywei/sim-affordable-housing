import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import { computeResults } from '@/lib/sim';
import { runLottery } from '@/lib/lottery';
import type { Meta } from '@/lib/types';

const meta = JSON.parse(fs.readFileSync('public/data/meta.json', 'utf8')) as Meta;
const results = computeResults(meta);

describe('lottery simulation', () => {
  test('median women-led winners is close to the expected share at 10%', () => {
    const s = runLottery(meta, results[10]);
    expect(s.homes).toBe(141);
    expect(Math.abs(s.median - results[10].womenHomes)).toBeLessThanOrEqual(3);
    expect(s.low).toBeLessThanOrEqual(s.median);
    expect(s.high).toBeGreaterThanOrEqual(s.median);
  });
  test('deterministic for a seed', () => {
    expect(runLottery(meta, results[8], 500, 7)).toEqual(runLottery(meta, results[8], 500, 7));
  });
  test('no homes, no winners', () => {
    const s = runLottery(meta, results[0]);
    expect([s.homes, s.median, s.low, s.high]).toEqual([0, 0, 0, 0]);
  });
});

describe('lottery breakdown', () => {
  test('all homes go to someone, split roughly by eligible shares', () => {
    const s = runLottery(meta, results[10]);
    const shares = meta.qualifierShares!;
    for (const k of ['women_led', 'couple_led', 'men_led'] as const) {
      expect(Math.abs(s.byType[k].median - 141 * shares[k])).toBeLessThanOrEqual(4);
    }
    expect(s.sample.women_led + s.sample.couple_led + s.sample.men_led).toBe(141);
  });
});
