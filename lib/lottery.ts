// Lottery simulation (agent-style Monte Carlo, runs in the browser).
// Every eligible SF renter household (meta.qualifiers) is an applicant, split by household type
// (meta.qualifierShares). Each run draws one winner per affordable home, without replacement,
// and counts winners by type. We report the median and the usual (5th–95th percentile) range.
import type { Meta, SliderResult } from './types';

export type HouseholdType = 'women_led' | 'couple_led' | 'men_led';
export const HOUSEHOLD_TYPES: HouseholdType[] = ['women_led', 'couple_led', 'men_led'];

export interface GroupWins { median: number; low: number; high: number; }
export interface LotterySummary {
  runs: number;
  homes: number;
  applicants: number;
  median: number; low: number; high: number;          // women-led (kept for convenience)
  byType: Record<HouseholdType, GroupWins>;
  sample: Record<HouseholdType, number>;              // one example draw (for the animation)
}

/** mulberry32: small seeded RNG so results are reproducible for the demo. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quantile(sorted: number[], q: number): number {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))));
  return sorted[i];
}

export function runLottery(meta: Meta, result: SliderResult, runs = 1000, seed = 2026): LotterySummary {
  const applicants = Math.max(0, Math.round(meta.qualifiers));
  const homes = Math.min(result.affordableHomes, applicants);
  const womenShare = meta.qualifierShares?.women_led ?? meta.womenShareOfQualifiers ?? 0;
  const coupleShare = meta.qualifierShares?.couple_led ?? (1 - womenShare) / 2;
  const pool0: Record<HouseholdType, number> = {
    women_led: Math.round(applicants * womenShare),
    couple_led: Math.round(applicants * coupleShare),
    men_led: 0,
  };
  pool0.men_led = Math.max(0, applicants - pool0.women_led - pool0.couple_led);
  const rand = rng(seed + result.pct);
  const wins: Record<HouseholdType, number[]> = { women_led: [], couple_led: [], men_led: [] };
  let sample: Record<HouseholdType, number> = { women_led: 0, couple_led: 0, men_led: 0 };
  for (let r = 0; r < runs; r++) {
    const left = { ...pool0 };
    let leftAll = applicants;
    const got: Record<HouseholdType, number> = { women_led: 0, couple_led: 0, men_led: 0 };
    for (let h = 0; h < homes; h++) {
      const u = rand() * leftAll;
      const t: HouseholdType = u < left.women_led ? 'women_led' : u < left.women_led + left.couple_led ? 'couple_led' : 'men_led';
      got[t]++; left[t]--; leftAll--;
    }
    for (const t of HOUSEHOLD_TYPES) wins[t].push(got[t]);
    if (r === 0) sample = got;
  }
  const summarize = (xs: number[]): GroupWins => {
    const s = [...xs].sort((a, b) => a - b);
    return runs ? { median: quantile(s, 0.5), low: quantile(s, 0.05), high: quantile(s, 0.95) } : { median: 0, low: 0, high: 0 };
  };
  const byType = { women_led: summarize(wins.women_led), couple_led: summarize(wins.couple_led), men_led: summarize(wins.men_led) };
  return { runs, homes, applicants, ...byType.women_led, byType, sample };
}
