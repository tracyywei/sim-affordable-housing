// Owner: Agent C. Copy tests: no jargon on screen, templates fill in from the fixture, number guard works.
import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as copy from '@/lib/copy';
import { BUILDINGS, START_PCT } from '@/lib/constants';
import { computeResults } from '@/lib/sim';
import type { ExplainRequest, Meta, PersonasFile, Woman } from '@/lib/types';

const fx = (n: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/fixture', n), 'utf8'));
const meta: Meta = fx('meta.json');
const personas: PersonasFile = fx('personas.json');
const women: Woman[] = fx('women100.json');
const results = computeResults(meta);
const base = results[START_PCT];
const total = BUILDINGS.length;
const req = (pct: number): ExplainRequest => ({
  pct, result: results[pct], baseline: base, counts: meta.counts, gapCount: meta.gapCount,
});

/** Every on-screen string copy.ts can produce from the fixture (drawerCopy excluded on purpose). */
function allScreenStrings(): string[] {
  const out: unknown[] = [];
  const nWomen = women.length;
  out.push(copy.sliderLabel, copy.noBuildingsBanner, copy.claudeNapPrefix, copy.claudeLabel, copy.simplifiedModelPill,
    copy.basedOnRealRecord, copy.basedOnSyntheticRecord, copy.recordNote(meta), copy.stillCaption(nWomen),
    copy.legendTitle(nWomen), copy.legendGapLine(meta.gapCount), copy.lineupLabels(meta.counts), copy.affordableMeansCard(meta));
  for (const v of Object.values(copy.chrome)) out.push(typeof v === 'function' ? v(START_PCT) : v);
  for (const s of ['too_much', 'too_little', 'qualifies'] as const) out.push(copy.statusLabel(s), copy.statusLong(s));
  for (const r of results) {
    out.push(copy.sliderSentence(r.pct), copy.pctPill(r.pct), copy.buildingsCard(r, base, total), copy.affordableCard(r, base),
      copy.oddsCard(r, base), copy.legendOddsLine(r), copy.lineupOddsLine(r), copy.explainTemplate(req(r.pct)));
    for (const p of Object.values(personas)) out.push(copy.personaLines(p, r, meta));
    BUILDINGS.forEach((b, i) => out.push(copy.buildingPopover(b, r.built[i], r.pct, Math.round((b.units * r.pct) / 100))));
  }
  for (const w of women) out.push(copy.womanTooltip(w));
  return out.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)));
}

describe('plain language (SPEC §2)', () => {
  const strings = allScreenStrings();
  test('no banned jargon in any on-screen string', () => {
    for (const s of strings) expect(copy.hasBannedWord(s), s).toBeNull();
  });
  test('odds never say "this year"', () => {
    for (const s of strings) expect(s.toLowerCase()).not.toContain('this year');
  });
  test('the guard catches jargon', () => {
    expect(copy.hasBannedWord('The inclusionary rate')).toBe('inclusionary');
    expect(copy.hasBannedWord('80% of AMI')).toBe('AMI');
    expect(copy.hasBannedWord('the project pencils')).toBe('pencils');
    expect(copy.hasBannedWord('Amid the noise')).toBeNull();
  });
});

describe('formatting + change words', () => {
  test('formatters', () => {
    expect(copy.fmtMoney(54450)).toBe('$54,450');
    expect(copy.fmtK(52000)).toBe('$52K');
    expect(copy.fmtInt(1400)).toBe('1,400');
    expect(copy.homeName(0)).toBe('studio');
    expect(copy.homeName(1)).toBe('1-bedroom');
  });
  test('changeWords', () => {
    expect(copy.changeWords(17, 13)).toEqual({ text: '4 more than at 10%', tone: 'more' });
    expect(copy.changeWords(117, 141)).toEqual({ text: '24 fewer than at 10%', tone: 'fewer' });
    expect(copy.changeWords(5, 5)).toEqual({ text: 'same as at 10%', tone: 'same' });
    expect(copy.changeWords(14, 13, 'buildings').text).toBe('1 more building than at 10%');
  });
  test('slider sentence', () => {
    expect(copy.sliderSentence(10)).toBe('In a 100-apartment building, 10 must be affordable.');
  });
});

describe('templates fill in from the fixture', () => {
  test('scoreboards at 8% vs 10%', () => {
    const r = results[8];
    expect(copy.buildingsCard(r, base, total).value).toBe(`${r.buildingsBuilt} of ${total} get built`);
    expect(copy.affordableCard(r, base).of).toBe(`of ${copy.fmtInt(r.newHomes)} new`);
    const odds = copy.oddsCard(r, base);
    expect(odds.big).toBe(`1 in ${copy.fmtInt(r.oddsN!)}`);
    expect(odds.sub).toBe(`≈ ${r.womenHomes} of these homes would go to women-led households`);
    expect(copy.buildingsCard(base, base, total).change).toBeNull();
    expect(copy.oddsCard(results[0], base).big).toBe('No affordable homes required.');
  });
  test('Linh (too little) matches SPEC §9.4', () => {
    const l = copy.personaLines(personas.Linh, base, meta);
    expect(l.header).toBe('38 / Excelsior / Home health aide');
    expect(l.household).toBe('Raising 2 kids · $52K a year');
    expect(l.rent).toBe('Rent takes 55% of her income');
    expect(l.statusChip).toBe('Earns too little to qualify');
    expect(l.body).toBe("Linh would need to earn $62,250 for an affordable 1-bedroom ($2,594/month). That's $10,250 more than she makes.");
  });
  test('Ana (qualifies) quotes the odds from these buildings', () => {
    expect(copy.personaLines(personas.Ana, base, meta).body).toBe(
      `She can apply. With ${copy.fmtInt(base.oddsN!)} households competing for every home, her odds are 1 in ${copy.fmtInt(base.oddsN!)} from these ${total} buildings.`,
    );
  });
  test('Priya (gap) says the rule can\'t help her', () => {
    const p = personas.Priya;
    expect(copy.personaLines(p, base, meta).body).toBe(
      `She earns ${copy.fmtMoney(p.income - p.limit)} over the limit for her household size, but rent still takes ${Math.round(p.rentShare! * 100)}% of her income. This rule can't help her.`,
    );
  });
  test('tooltip, popover, affordable card, gap line', () => {
    const w = women.find((x) => x.size === 2)!;
    expect(copy.womanTooltip(w)).toBe(`Woman, 2 people at home, earns ${copy.fmtK(w.income)} · ${copy.statusLabel(w.status)}`);
    const folsom = BUILDINGS[2];
    expect(copy.buildingPopover(folsom, false, 10, 0).body).toContain(`It gets built up to ${folsom.breakEven}%.`);
    expect(copy.buildingPopover(folsom, true, 3, 6).body).toBe(`6 of its ${folsom.units} apartments are affordable (made-up building, simplified model).`);
    expect(copy.affordableMeansCard(meta).text).toBe(
      'An affordable studio costs $2,269 a month. To get one, a woman living alone must earn between $54,450 and $90,750. Family of 3: $62,250–$116,700 for a 1-bedroom.',
    );
    expect(copy.legendGapLine(meta.gapCount)).toBe(`${meta.gapCount} of them still spend 30%+ of income on rent`);
  });
  test('drawer: synthetic wording + forScale only when present', () => {
    expect(copy.drawerCopy.womenNote({ synthetic: true })).toContain('synthetic, based on Census statistics');
    expect(copy.drawerCopy.womenNote({})).toBe('Women are real anonymized Census records with invented names.');
    expect(copy.drawerCopy.forScale({ forScale: null })).toBeNull();
    expect(copy.drawerCopy.forScale(meta)).toBe(`For scale: SF completed ${meta.forScale!.affordableHomes} affordable homes in ${meta.forScale!.year}.`);
  });
});

describe('explain template + number guard', () => {
  test('template at every pct uses only payload numbers', () => {
    for (const r of results) expect(copy.unknownNumbers(copy.explainTemplate(req(r.pct)), req(r.pct)), `pct ${r.pct}`).toEqual([]);
  });
  test('template at 10% and 8%', () => {
    const t10 = copy.explainTemplate(req(10));
    expect(t10).toContain(`At 10%, ${base.buildingsBuilt} of ${total} buildings get built`);
    expect(t10).toContain(`1 in ${copy.fmtInt(base.oddsN!)} from these ${total} buildings`);
    const r8 = results[8];
    expect(copy.explainTemplate(req(8))).toContain(`${copy.fmtInt(r8.affordableHomes)} of their ${copy.fmtInt(r8.newHomes)} new homes are affordable`);
  });
  test('extractNumbers handles commas, $, %, "1 in N"', () => {
    expect(copy.extractNumbers('1,400 homes, $2,269 a month, 8%, odds 1 in 560.')).toEqual([1400, 2269, 8, 560]);
  });
  test('guard rejects invented numbers, accepts payload numbers and differences', () => {
    const q = req(8);
    const r = results[8];
    const ok = `At 8%, ${r.affordableHomes} homes are affordable, ${Math.abs(r.affordableHomes - base.affordableHomes)} more than at 10%; odds are 1 in ${copy.fmtInt(r.oddsN!)}.`;
    expect(copy.unknownNumbers(ok, q)).toEqual([]);
    expect(copy.unknownNumbers('About 4,321 families would benefit by 2030.', q)).toEqual([4321, 2030]);
  });
  test('cache key changes when the data changes', () => {
    const a = copy.explainPayloadKey(req(8));
    expect(copy.explainPayloadKey({ ...req(8), gapCount: meta.gapCount + 1 })).not.toBe(a);
    expect(copy.explainPayloadKey(req(8))).toBe(a);
  });
});
