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
    copy.legendTitle(nWomen), copy.legendGapLine(meta.gapCount), copy.lineupLabels(meta.counts), copy.affordableMeansCard(meta),
    copy.scaleLine(100), copy.legendGapLine(meta.gapCount, 100), copy.tradeoffCaption(), copy.leftOutCard({ ...meta, scale: 100 }));
  for (const st of ['too_much', 'too_little', 'qualifies'] as const) out.push(copy.groupRow(st, meta.counts[st], nWomen, 100));
  for (const v of Object.values(copy.chrome)) out.push(typeof v === 'function' ? v(START_PCT) : v);
  for (const s of ['too_much', 'too_little', 'qualifies'] as const) out.push(copy.statusLabel(s), copy.statusLong(s));
  for (const r of results) {
    out.push(copy.sliderSentence(r.pct), copy.pctPill(r.pct), copy.buildingsCard(r, base, total), copy.affordableCard(r, base),
      copy.oddsCard(r, base), copy.legendOddsLine(r), copy.newHomesCard(r, total), copy.affordableHomesCard(r), copy.lineupOddsLine(r), copy.explainTemplate(req(r.pct)));
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
  test('Linh (below the minimum income) explains why low income does not qualify', () => {
    const p = personas.Linh;
    const l = copy.personaLines(p, base, meta);
    expect(l.header).toBe(`${p.age} / ${p.neighborhood} / ${p.job}`);
    expect(l.household).toBe(`Raising ${p.kids} kids · ${copy.fmtK(p.income)} a year`);
    expect(l.statusChip).toBe('Below the minimum income');
    expect(l.body).toBe(
      `Affordable units still charge rent: ${copy.fmtMoney(meta.rent[String(p.homeBedrooms)])}/month for a ${copy.homeName(p.homeBedrooms)}. ` +
        `Applicants must earn at least twice the yearly rent, ${copy.fmtMoney(p.floor)}. Linh earns ${copy.fmtMoney(p.income)}, which is ${copy.fmtMoney(p.floor - p.income)} short.`,
    );
  });
  test('Ana (eligible) gets the odds', () => {
    const n = copy.fmtInt(base.oddsN!);
    expect(copy.personaLines(personas.Ana, base, meta).body).toBe(`Eligible. With ${n} eligible households for every affordable home, her odds are 1 in ${n}.`);
    expect(copy.personaLines(personas.Ana, results[0], meta).body).toBe('Eligible, but at this setting there are no affordable homes to apply for.');
  });
  test('Priya (above the limit, rent-burdened)', () => {
    const p = personas.Priya;
    expect(copy.personaLines(p, base, meta).body).toBe(
      `Earns ${copy.fmtMoney(p.income - p.limit)} above the income limit for ${p.size} ${p.size === 1 ? 'person' : 'people'}, yet rent takes ${Math.round(p.rentShare! * 100)}% of her income.`,
    );
  });
  test('legend: title, scale, group rows, gap line, odds', () => {
    expect(copy.legendTitle()).toBe('Women-led renter households in SF');
    expect(copy.scaleLine(100)).toBe('Each figure = 100 households');
    expect(copy.groupRow('too_much', 318, 740, 100)).toEqual({ label: 'Above the income limit', pct: '43%', households: '≈31,800 households' });
    expect(copy.legendGapLine(9, 100)).toBe('≈900 still spend 30%+ of income on rent');
    expect(copy.legendOddsLine(base)).toBe(`Odds: 1 in ${copy.fmtInt(base.oddsN!)}`);
    expect(copy.legendOddsLine(results[0])).toBe('No affordable homes');
  });
  test('right rail cards', () => {
    expect(copy.newHomesCard(base, total)).toEqual({
      label: 'New homes built', big: copy.fmtInt(base.newHomes), sub: `in ${base.buildingsBuilt} of ${total} proposed buildings`,
    });
    expect(copy.affordableHomesCard(base)).toEqual({
      label: 'Affordable homes', big: copy.fmtInt(base.affordableHomes), sub: `of the ${copy.fmtInt(base.newHomes)} new homes`,
    });
    const scaled: Meta = { ...meta, scale: 100, counts: { too_much: 318, too_little: 41, qualifies: 381 } };
    expect(copy.leftOutCard(scaled)).toEqual({
      label: 'Low-income women left out', big: '≈4,100', sub: 'women-led households earn below the minimum income at every setting',
    });
  });
  test('tooltip, popover, affordable card', () => {
    const w = women.find((x) => x.size === 2)!;
    expect(copy.womanTooltip(w)).toBe(`Woman, 2 people at home, earns ${copy.fmtK(w.income)} · ${copy.statusLabel(w.status)}`);
    const folsom = BUILDINGS[2];
    expect(copy.buildingPopover(folsom, false, 10, 0).body).toContain(`It gets built up to ${folsom.breakEven}%.`);
    expect(copy.buildingPopover(folsom, true, 3, 6).body).toBe(`6 of its ${folsom.units} apartments are affordable (made-up building, simplified model).`);
    expect(copy.affordableMeansCard(meta).text).toBe(
      'Rent for an affordable studio is set at $2,269/month (a fixed city limit, not an average). ' +
        'To qualify, a person living alone must earn $54,450–$90,750. ' +
        'A household of 3 (for example, a parent with 2 children) must earn $62,250–$116,700 for a 1-bedroom.',
    );
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
