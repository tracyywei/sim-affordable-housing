// Lottery simulation (agent-style Monte Carlo, runs in the browser).
// Every eligible SF renter household (meta.qualifiers) is an applicant; a share of them
// (meta.womenShareOfQualifiers) are women-led. Each run draws winners without replacement,
// one per affordable home, and counts how many winners are women-led households.
import type { Meta, SliderResult } from './types';

export interface LotterySummary {
  runs: number;
  homes: number;
  applicants: number;
  median: number;   // women-led winners, median across runs
  low: number;      // 5th percentile
  high: number;     // 95th percentile
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
  const women = Math.round(applicants * (meta.womenShareOfQualifiers ?? 0));
  const rand = rng(seed + result.pct);
  const wins: number[] = [];
  for (let r = 0; r < runs; r++) {
    let leftAll = applicants;
    let leftWomen = women;
    let w = 0;
    for (let h = 0; h < homes; h++) {
      if (rand() < leftWomen / leftAll) { w++; leftWomen--; }
      leftAll--;
    }
    wins.push(w);
  }
  wins.sort((a, b) => a - b);
  return {
    runs, homes, applicants,
    median: runs ? quantile(wins, 0.5) : 0,
    low: runs ? quantile(wins, 0.05) : 0,
    high: runs ? quantile(wins, 0.95) : 0,
  };
}
