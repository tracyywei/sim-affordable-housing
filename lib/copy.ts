// Every sentence on screen lives here, as pure functions (owner: Agent C).
// Rules: numbers only come in as arguments (from the simulation or the data files);
// no jargon (see BANNED_WORDS) in anything except `drawerCopy`; Claude explains, never recommends;
// odds wording is "from these N buildings", never "this year".

import type {
  BuildingDef,
  ExplainRequest,
  Meta,
  Persona,
  SliderResult,
  Status,
  Woman,
} from './types';

/** Words that must never appear on screen outside the ⓘ drawer (SPEC §2). */
export const BANNED_WORDS = ['AMI', 'inclusionary', 'BMR', 'feasible', 'feasibility', 'pencils', 'pencil out'];

/** The base percentage everything is compared against (the "starting point"). */
export const BASE_PCT = 10;

/* ------------------------------------------------------------------ formatting */

/** 54450 -> "$54,450" */
export function fmtMoney(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

/** 52000 -> "$52K", 54450 -> "$54K", 950 -> "$950" */
export function fmtK(n: number): string {
  if (Math.abs(n) < 1000) return '$' + Math.round(n);
  return '$' + Math.round(n / 1000) + 'K';
}

/** 1400 -> "1,400" */
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** 0.553 -> "55%" */
export function fmtPctShare(share: number): string {
  return Math.round(share * 100) + '%';
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/* ------------------------------------------------------------------ status + homes */

export function statusLabel(status: Status): string {
  switch (status) {
    case 'too_much': return 'Above the income limit';
    case 'too_little': return 'Below the minimum income';
    case 'qualifies': return 'Eligible';
  }
}

export function statusLong(status: Status): string {
  switch (status) {
    case 'too_much': return 'Above the income limit';
    case 'too_little': return 'Below the minimum income';
    case 'qualifies': return 'Eligible for an affordable unit';
  }
}

/** 0 -> "studio", 1 -> "1-bedroom" ... */
export function homeName(br: number): string {
  return br <= 0 ? 'studio' : `${br}-bedroom`;
}

/** Home-size rule (SPEC §5.1): 1 person -> studio, 2–3 -> 1BR, 4–5 -> 2BR, 6+ -> 3BR. */
export function bedroomsForSize(size: number): number {
  if (size <= 1) return 0;
  if (size <= 3) return 1;
  if (size <= 5) return 2;
  return 3;
}

/* ------------------------------------------------------------------ control bar */

export const sliderLabel = 'Share of units in proposed buildings that must be affordable';

/** One line under the slider (replaces sliderSentence on screen). */
export function tradeoffCaption(): string {
  return 'Lower share: more buildings get built. Higher share: more affordable homes in each building, until buildings stop getting built.';
}

/** "10%" */
export function pctPill(pct: number): string {
  return `${pct}%`;
}

/** "In a 100-apartment building, 10 must be affordable." */
export function sliderSentence(pct: number): string {
  const n = Math.round((100 * pct) / 100);
  if (n === 0) return 'In a 100-apartment building, none have to be affordable.';
  return `In a 100-apartment building, ${n} must be affordable.`;
}

/** Shown after the slider sits still for 600 ms. */
export function stillCaption(womenCount: number): string {
  return `Same ${fmtInt(womenCount)} women. Moving the slider doesn't change who qualifies, only how many homes there are.`;
}

/* ------------------------------------------------------------------ scoreboards */

export type Tone = 'more' | 'fewer' | 'same';
export interface Change { text: string; tone: Tone; }

/**
 * Change vs. the starting point, in words.
 * changeWords(17, 13, 'buildings') -> { text: "4 more buildings than at 10%", tone: 'more' }
 * Without a noun: "4 more than at 10%". A plural noun ending in "s" is singularized for 1.
 */
export function changeWords(now: number, then: number, noun = '', basePct: number = BASE_PCT): Change {
  const d = now - then;
  if (d === 0) return { text: `same as at ${basePct}%`, tone: 'same' };
  const abs = Math.abs(d);
  let n = noun;
  if (n && abs === 1 && n.endsWith('s')) n = n.slice(0, -1);
  const mid = n ? ` ${n}` : '';
  return d > 0
    ? { text: `${fmtInt(abs)} more${mid} than at ${basePct}%`, tone: 'more' }
    : { text: `${fmtInt(abs)} fewer${mid} than at ${basePct}%`, tone: 'fewer' };
}

export interface ScoreCard {
  label: string;
  /** big number, e.g. "13" or "1 in 560" */
  big: string;
  /** small text after the big number, e.g. "of 20" */
  of: string;
  /** full value for screen readers, e.g. "13 of 20" */
  value: string;
  /** second line (odds card only) */
  sub: string | null;
  /** change vs. the starting point; null when the slider is at the starting point */
  change: Change | null;
}

function isBase(result: SliderResult, baseline: SliderResult): boolean {
  return result.pct === baseline.pct;
}

/** 🏢 Buildings "13 of 20" */
export function buildingsCard(result: SliderResult, baseline: SliderResult, total: number): ScoreCard {
  const big = fmtInt(result.buildingsBuilt);
  const of = `of ${fmtInt(total)}`;
  return {
    label: 'Buildings',
    big,
    of,
    value: `${big} ${of} get built`,
    sub: null,
    change: isBase(result, baseline) ? null : changeWords(result.buildingsBuilt, baseline.buildingsBuilt, '', baseline.pct),
  };
}

/** 🏠 Affordable homes "141 of 1,400 new" */
export function affordableCard(result: SliderResult, baseline: SliderResult): ScoreCard {
  const big = fmtInt(result.affordableHomes);
  const of = `of ${fmtInt(result.newHomes)} new`;
  return {
    label: 'Affordable homes',
    big,
    of,
    value: `${big} affordable ${of} homes`,
    sub: null,
    change: isBase(result, baseline) ? null : changeWords(result.affordableHomes, baseline.affordableHomes, '', baseline.pct),
  };
}

/** 🎟 Odds "1 in N" + "≈ W of these homes would go to women-led households" */
export function oddsCard(result: SliderResult, baseline: SliderResult): ScoreCard {
  const base: Omit<ScoreCard, 'big' | 'of' | 'value' | 'sub'> = {
    label: 'Odds',
    change: isBase(result, baseline) ? null : oddsChange(result, baseline),
  };
  if (result.pct === 0) {
    const t = 'No affordable homes required.';
    return { ...base, big: t, of: '', value: t, sub: null };
  }
  if (result.oddsN === null || result.affordableHomes === 0) {
    const t = 'No affordable homes get built.';
    return { ...base, big: t, of: '', value: t, sub: null };
  }
  const big = `1 in ${fmtInt(result.oddsN)}`;
  return {
    ...base,
    big,
    of: '',
    value: `Odds: ${big}`,
    sub: `≈ ${fmtInt(result.womenHomes)} of these homes would go to women-led households`,
  };
}

/** Odds change in words: more homes = better odds (teal), fewer = worse (orange). */
function oddsChange(result: SliderResult, baseline: SliderResult): Change {
  const tone: Tone =
    result.affordableHomes > baseline.affordableHomes ? 'more'
    : result.affordableHomes < baseline.affordableHomes ? 'fewer'
    : 'same';
  const at = baseline.oddsN === null ? 'no homes' : `1 in ${fmtInt(baseline.oddsN)}`;
  if (tone === 'same') return { text: `same as at ${baseline.pct}%`, tone };
  return { text: `${tone === 'more' ? 'better' : 'worse'} than ${at} at ${baseline.pct}%`, tone };
}

export interface RailCard { label: string; big: string; sub: string; }

/** (1) "New homes built" · "1,400" · "in 13 of 20 proposed buildings" */
export function newHomesCard(result: SliderResult, total: number): RailCard {
  return {
    label: 'New homes built',
    big: fmtInt(result.newHomes),
    sub: `in ${fmtInt(result.buildingsBuilt)} of ${fmtInt(total)} proposed buildings`,
  };
}

/** (2) "Affordable homes" · "141" · "of the 1,400 new homes" */
export function affordableHomesCard(result: SliderResult): RailCard {
  return {
    label: 'Affordable homes',
    big: fmtInt(result.affordableHomes),
    sub: `of the ${fmtInt(result.newHomes)} new homes`,
  };
}

/** (3) "Low-income women left out" · "≈4,100" (counts.too_little × scale) · fixed sub */
export function leftOutCard(meta: Meta): RailCard {
  return {
    label: 'Low-income women left out',
    big: fmtHouseholds(meta.counts.too_little * figureScale(meta)),
    sub: 'women-led households earn below the minimum income at every setting',
  };
}

/** (3) "Odds for eligible households" · "1 in 236" · "of getting one of these affordable homes" */
export function oddsRailCard(result: SliderResult): RailCard {
  if (result.oddsN == null) {
    return { label: 'Odds for eligible households', big: 'None', sub: 'no affordable homes are required at 0%' };
  }
  return {
    label: 'Odds for eligible households',
    big: `1 in ${fmtInt(result.oddsN)}`,
    sub: 'of getting one of these affordable homes',
  };
}

export const noBuildingsBanner ='At this level no building gets built (simplified model).';

/* ------------------------------------------------------------------ "What 'affordable' means here" */

export interface Seg { text: string; bold?: boolean; }

export interface AffordableMeans {
  title: string;
  /** sentences as segments so the UI can bold the key numbers */
  sentences: Seg[][];
  /** the same, as plain text */
  text: string;
}

export function affordableMeansCard(meta: Meta): AffordableMeans {
  const studioRent = meta.rent['0'];
  const singleFloor = meta.floor['0'];
  const singleLimit = meta.limit['1'];
  const fam = 3;
  const famBr = bedroomsForSize(fam);
  const famFloor = meta.floor[String(famBr)];
  const famLimit = meta.limit[String(fam)];
  const sentences: Seg[][] = [
    [
      { text: 'Rent for an affordable studio is set at ' },
      { text: `${fmtMoney(studioRent)}/month`, bold: true },
      { text: ' (a fixed city limit, not an average).' },
    ],
    [
      { text: 'To qualify, a person living alone must earn ' },
      { text: `${fmtMoney(singleFloor)}–${fmtMoney(singleLimit)}`, bold: true },
      { text: '.' },
    ],
    [
      { text: `A household of ${fam} (for example, a parent with ${fam - 1} children) must earn ` },
      { text: `${fmtMoney(famFloor)}–${fmtMoney(famLimit)}`, bold: true },
      { text: ` for a ${homeName(famBr)}.` },
    ],
  ];
  return {
    title: 'What "affordable" means',
    sentences,
    text: sentences.map((x) => x.map((g) => g.text).join('')).join(' '),
  };
}

/* ------------------------------------------------------------------ legend + line-up */

/** Households each figure stands for (meta.scale; 1 if the data predates scaling). */
export function figureScale(meta: Pick<Meta, 'scale'>): number {
  return meta.scale ?? 1;
}

/** 31800 -> "≈31,800" (rounded to the nearest 100 when ≥ 100). */
export function fmtHouseholds(n: number): string {
  const r = n >= 100 ? Math.round(n / 100) * 100 : Math.round(n);
  return `≈${fmtInt(r)}`;
}

/** Legend title. (The argument is ignored; kept so older callers compile.) */
export function legendTitle(_womenCount?: number): string {
  return 'Women-led renter households in SF';
}

/** "Each figure = 100 households" */
export function scaleLine(scale: number): string {
  return `Each figure = ${fmtInt(scale)} ${plural(scale, 'household', 'households')}`;
}

export interface GroupRow { label: string; pct: string; households: string; }

/** Legend row: { label: "Above the income limit", pct: "43%", households: "≈31,800 households" } */
export function groupRow(status: Status, count: number, total: number, scale: number): GroupRow {
  return {
    label: statusLabel(status),
    pct: total > 0 ? `${Math.round((count / total) * 100)}%` : '0%',
    households: `${fmtHouseholds(count * scale)} households`,
  };
}

/** Under "Above the income limit": "≈900 still spend 30%+ of income on rent" */
export function legendGapLine(gapCount: number, scale: number = 1): string {
  return `${fmtHouseholds(gapCount * scale)} still spend 30%+ of income on rent`;
}

/** Eligible row: "Odds: 1 in N" (or "No affordable homes"). */
export function legendOddsLine(result: SliderResult): string {
  if (result.oddsN === null || result.affordableHomes === 0) return 'No affordable homes';
  return `Odds: 1 in ${fmtInt(result.oddsN)}`;
}

export function lineupLabels(counts: Record<Status, number>): Record<Status, { label: string; count: string }> {
  return {
    too_much: { label: statusLabel('too_much'), count: fmtInt(counts.too_much) },
    too_little: { label: statusLabel('too_little'), count: fmtInt(counts.too_little) },
    qualifies: { label: statusLabel('qualifies'), count: fmtInt(counts.qualifies) },
  };
}

/** Under the qualify block: "For them, the odds are 1 in N from these 20 buildings." */
export function lineupOddsLine(result: SliderResult): string {
  const total = fmtInt(result.built.length);
  if (result.pct === 0) return `For them, no affordable homes are required from these ${total} buildings.`;
  if (result.oddsN === null) return `For them, no affordable homes get built from these ${total} buildings.`;
  return `For them, the odds are 1 in ${fmtInt(result.oddsN)} from these ${total} buildings.`;
}

/* ------------------------------------------------------------------ personas + women */

export const basedOnRealRecord = 'Based on a real, anonymized Census household.';
export const basedOnSyntheticRecord = 'Based on a synthetic household built from Census statistics.';

/** Use this on persona cards: honest when the data fell back to synthetic records. */
export function recordNote(meta: Pick<Meta, 'synthetic'> | null | undefined): string {
  return meta?.synthetic ? basedOnSyntheticRecord : basedOnRealRecord;
}

/** "38 / Excelsior / Home health aide" */
export function personaHeader(p: Persona): string {
  return `${p.age} / ${p.neighborhood} / ${p.job}`;
}

function householdPhrase(w: Woman): string {
  if (w.kids > 0) return `Raising ${w.kids} ${plural(w.kids, 'kid', 'kids')}`;
  if (w.size <= 1) return 'Lives alone';
  return `${w.size} people at home`;
}

export interface PersonaLines {
  header: string;
  /** "Raising 2 kids · $52K a year" */
  household: string;
  /** "Rent takes 55% of her income" (null if the record has no rent) */
  rent: string | null;
  /** chip text, e.g. "Earns too little to qualify" */
  statusChip: string;
  status: Status;
  /** the status template (SPEC §9.4) */
  body: string;
  /** "Based on a real, anonymized Census household." */
  note: string;
}

/**
 * Persona card text. `meta` is optional; when given, the too-little line includes the home's rent.
 */
export function personaLines(p: Persona, result: SliderResult, meta?: Meta): PersonaLines {
  const household = `${householdPhrase(p)} · ${fmtK(p.income)} a year`;
  const rent = p.rentShare !== null ? `Rent takes ${fmtPctShare(p.rentShare)} of her income` : null;
  let body: string;
  switch (p.status) {
    case 'too_little': {
      const home = homeName(p.homeBedrooms);
      const r = meta?.rent[String(p.homeBedrooms)];
      const rentPart = r !== undefined ? `Affordable units still charge rent: ${fmtMoney(r)}/month for a ${home}.` : 'Affordable units still charge rent.';
      body = `${rentPart} Applicants must earn at least twice the yearly rent, ${fmtMoney(p.floor)}. ${p.persona} earns ${fmtMoney(p.income)}, which is ${fmtMoney(p.floor - p.income)} short.`;
      break;
    }
    case 'qualifies': {
      if (result.oddsN === null || result.affordableHomes === 0) {
        body = 'Eligible, but at this setting there are no affordable homes to apply for.';
      } else {
        const n = fmtInt(result.oddsN);
        body = `Eligible. With ${n} eligible households for every affordable home, her odds are 1 in ${n}.`;
      }
      break;
    }
    case 'too_much': {
      const over = fmtMoney(p.income - p.limit);
      const who = `${p.size} ${plural(p.size, 'person', 'people')}`;
      body = p.gap && p.rentShare !== null
        ? `Earns ${over} above the income limit for ${who}, yet rent takes ${fmtPctShare(p.rentShare)} of her income.`
        : `Earns ${over} above the income limit for ${who}.`;
      break;
    }
  }
  return {
    header: personaHeader(p),
    household,
    rent,
    statusChip: statusLong(p.status),
    status: p.status,
    body,
    note: recordNote(meta),
  };
}

/** "Woman, 2 people at home, earns $74K · Qualifies" */
export function womanTooltip(w: Woman): string {
  const home = w.size <= 1 ? 'lives alone' : `${w.size} people at home`;
  return `Woman, ${home}, earns ${fmtK(w.income)} · ${statusLabel(w.status)}`;
}

/* ------------------------------------------------------------------ buildings */

export interface BuildingPopover {
  title: string;       // "Folsom Yards"
  sub: string;         // "South of Market · 200 apartments"
  head: string;        // "At 10%:"
  status: string;      // "✕ Not built" / "✓ Built"
  built: boolean;
  body: string;
}

/**
 * Building popover (SPEC §9.4).
 * `affordableInBuilding` = Math.round(units × pct / 100) from the sim (pass 0 when not built).
 */
export function buildingPopover(b: BuildingDef, built: boolean, pct: number, affordableInBuilding: number): BuildingPopover {
  const sub = `${b.neighborhood} · ${fmtInt(b.units)} apartments`;
  const head = `At ${pct}%:`;
  if (built) {
    const body =
      pct === 0
        ? `None of its ${fmtInt(b.units)} apartments have to be affordable at this level (made-up building, simplified model).`
        : `${fmtInt(affordableInBuilding)} of its ${fmtInt(b.units)} apartments are affordable (made-up building, simplified model).`;
    return { title: b.name, sub, head, status: '✓ Built', built, body };
  }
  const why = "The developer says it doesn't make enough money at this level (made-up numbers, simplified model).";
  const range =
    b.breakEven < 0
      ? "It doesn't get built at any level, even with no affordable homes required."
      : `It gets built up to ${b.breakEven}%.`;
  return { title: b.name, sub, head, status: '✕ Not built', built, body: `${why} ${range}` };
}

/* ------------------------------------------------------------------ explain */

export const claudeNapPrefix = "Claude's taking a nap; here's the quick version:";
export const claudeLabel = '✨ Claude';

/**
 * The instant Explain sentence (and the fallback when Claude is unavailable).
 * Uses only numbers present in the payload (plus differences vs. the starting point).
 */
export function explainTemplate(req: ExplainRequest): string {
  const { pct, result: r, baseline: b, counts, gapCount } = req;
  const total = r.built.length;
  const women = counts.too_much + counts.too_little + counts.qualifies;
  const atBase = pct === b.pct;

  // Sentence 1: buildings and homes.
  let s1: string;
  if (r.buildingsBuilt === 0) {
    s1 = `At ${pct}%, none of the ${fmtInt(total)} buildings get built, so there are no new homes at all.`;
  } else if (pct === 0 || r.affordableHomes === 0) {
    s1 = `At ${pct}%, ${fmtInt(r.buildingsBuilt)} of ${fmtInt(total)} buildings get built, but none of their ${fmtInt(r.newHomes)} new homes have to be affordable.`;
  } else {
    const bld = atBase ? '' : ` (${changeWords(r.buildingsBuilt, b.buildingsBuilt, '', b.pct).text})`;
    const aff = atBase ? '' : ` (${changeWords(r.affordableHomes, b.affordableHomes, '', b.pct).text})`;
    s1 = `At ${pct}%, ${fmtInt(r.buildingsBuilt)} of ${fmtInt(total)} buildings get built${bld}, and ${fmtInt(r.affordableHomes)} of their ${fmtInt(r.newHomes)} new homes are affordable${aff}.`;
  }

  // Sentence 2: who is left out no matter what.
  const s2 = `Of these ${fmtInt(women)} women, ${fmtInt(counts.qualifies)} qualify; ${fmtInt(counts.too_much)} earn too much (${fmtInt(gapCount)} of them still spend 30%+ of income on rent) and ${fmtInt(counts.too_little)} earn too little, whatever the slider says.`;

  // Sentence 3: odds for those who qualify.
  const s3 =
    r.oddsN === null
      ? `For the ${fmtInt(counts.qualifies)} who qualify, there are no affordable homes to apply for at this level.`
      : `For those who qualify, the odds are 1 in ${fmtInt(r.oddsN)} from these ${fmtInt(total)} buildings.`;

  return `${s1} ${s2} ${s3}`;
}

/* ------------------------------------------------------------------ chrome */

export const simplifiedModelPill = 'Simplified model: real income limits, made-up buildings';

export const chrome = {
  title: "Who's Left Out",
  subtitle: 'How much affordable housing should new SF buildings include?',
  loading: 'Loading the map…',
  loadError: "Couldn't load the data. Try reloading.",
  railLabel: 'Results',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  meet: 'Meet:',
  incomeBarLabel: 'Income range that qualifies',
  backToCity: '⟲ back to the whole city',
  escToZoomOut: 'esc to zoom out',
  dragMe: 'drag me!',
  thisIsLinh: 'this is Linh',
  startingPoint: '▲ starting point (not current law)',
  lineUp: 'Group by eligibility',
  backToMap: 'Back to map',
  explain: '✨ Explain this',
  thinking: 'thinking…',
  close: 'Close',
  info: 'How this works',
  scoreboardChangeAt: (basePct: number) => `vs. ${basePct}%`,
} as const;

/* ------------------------------------------------------------------ ⓘ drawer (jargon allowed ONLY here) */

export interface DrawerSection { title: string; lines: string[]; }

export const drawerCopy = {
  title: 'How this works',
  realityCheckTitle: 'Reality check',
  notesTitle: 'Notes',
  sourcesTitle: 'Sources',
  validationHeaders: ['Stat', 'Our data (Census records)', 'Published (ACS)', 'Diff (pts)'],
  validationEmpty: 'Validation table not available yet.',
  sliderTerm: 'The slider is the inclusionary requirement: the share of units in a new building that must be affordable (BMR).',

  assumptions(meta: Meta): DrawerSection {
    const lim = Object.keys(meta.limit)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => `${k} ${plural(Number(k), 'person', 'people')} ${fmtMoney(meta.limit[k])}`)
      .join(' · ');
    const rents = Object.keys(meta.rent)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => `${homeName(Number(k))} ${fmtMoney(meta.rent[k])}`)
      .join(' · ');
    const floors = Object.keys(meta.floor)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => `${homeName(Number(k))} ${fmtMoney(meta.floor[k])}`)
      .join(' · ');
    return {
      title: 'Assumptions and formulas',
      lines: [
        `Upper income limit (MOHCD 2026, 80% of AMI, by household size): ${lim}.`,
        'Home size: 1 person → studio · 2–3 → 1-bedroom · 4–5 → 2-bedroom · 6+ → 3-bedroom.',
        `Capped rent = 30% of the limit for (bedrooms + 1) people, per month: ${rents}.`,
        `Lower income limit = 2 × yearly rent (assumption, verify against MOHCD's Inclusionary Procedures Manual): ${floors}.`,
        'Housing-voucher holders are usually exempt from the lower limit; that is out of scope here.',
        'Status: income above the limit → earns too much; below the lower limit → earns too little; otherwise qualifies.',
        'A building gets built if its break-even % (the highest requirement at which it still pencils) is at least the slider value.',
        'Affordable homes = sum over built buildings of round(units × % / 100).',
        `Odds = all SF renter households that qualify (${fmtInt(meta.qualifiers)}) ÷ affordable homes. The lottery isn't women-only.`,
        `Homes to women-led households = affordable homes × the women-led share of qualifiers (${fmtPctShare(meta.womenShareOfQualifiers)}).`,
        `The gap: women-led renters above the limit who still pay 30%+ of income on rent (${fmtInt(meta.gapCount)} of these women).`,
      ],
    };
  },

  buildingNote: (total: number) =>
    `The ${total} buildings, their sizes, break-even points and names are made up, shaped after the SF Controller’s 2023 feasibility findings (many prototypes were infeasible even with no requirement). Simplified model: it shows the tradeoff; it does not predict.`,
  startingPointNote: (basePct: number) => `${basePct}% is a starting point for comparison, not current law. SF's real requirements vary by project size and have changed.`,
  placementNote: 'Neighborhood placement is illustrative.',

  womenNote(meta: Pick<Meta, 'synthetic'>): string {
    return meta.synthetic
      ? 'These women are synthetic, based on Census statistics, with invented names.'
      : 'Women are real anonymized Census records with invented names.';
  },

  /** null when meta.forScale is null: don't render the line. */
  forScale(meta: Pick<Meta, 'forScale'>): string | null {
    if (!meta.forScale) return null;
    return `For scale: SF completed ${fmtInt(meta.forScale.affordableHomes)} affordable homes in ${meta.forScale.year}.`;
  },

  claudeNote: 'Claude explains the numbers on screen; it does not recommend a policy.',

  validationTitle: 'Checks against published Census tables',
  buildingTableTitle: (total: number) => `The ${total} buildings (made up)`,
  buildingTableHeaders: ['#', 'Name', 'Neighborhood', 'Apartments', 'Built up to'],

  sources: [
    { label: 'MOHCD 2026 inclusionary income limits', url: 'https://www.sf.gov/reports--may-2024--income-and-rent-limits-inclusionary-rental-units' },
    { label: 'MOHCD 2026 AMI chart', url: 'https://media.api.sf.gov/documents/2026_AMI-IncomeLimits-HMFA.pdf' },
    { label: 'SF Planning, Inclusionary program', url: 'https://sfplanning.org/project/inclusionary-affordable-housing-program' },
    { label: 'SF Controller Triennial Feasibility Report 2023', url: 'https://sf.gov/sites/default/files/2023-06/Triennial%20Economic%20Feasibilty%20Report%202023.pdf' },
    { label: 'Grounded Solutions calculator (ABAG)', url: 'https://abag.ca.gov/technical-assistance/inclusionary-housing-calculator' },
    { label: 'ULI SF + Terner Labs simulator', url: 'https://fall.uli.org/?p=3373' },
    { label: 'DataSF Analysis Neighborhoods', url: 'https://data.sfgov.org/d/p5b7-5n3h' },
    { label: 'GEPI Women & Housing in CA 2024 (California-wide)', url: 'https://thegepi.org/data-brief-women-and-housing-in-california-2024/' },
    { label: 'SF.gov Poverty in SF', url: 'https://sf.gov/data/poverty-san-francisco' },
    { label: 'Census ACS PUMS (women-led renter households)', url: 'https://www.census.gov/programs-surveys/acs/microdata.html' },
  ],
} as const;

/* ------------------------------------------------------------------ explain helpers (used by /api/explain + tests) */

/** Plain-words facts handed to Claude alongside the payload; every number here passes the guard. */
export function explainFacts(req: ExplainRequest): string[] {
  const { pct, result: r, baseline: b, counts, gapCount } = req;
  const total = r.built.length;
  const women = counts.too_much + counts.too_little + counts.qualifies;
  const facts = [
    `Slider: ${pct}% of new homes must be affordable (the starting point for comparison is ${b.pct}%).`,
    `${r.buildingsBuilt} of ${total} buildings get built, with ${fmtInt(r.newHomes)} new homes, ${fmtInt(r.affordableHomes)} of them affordable.`,
    r.oddsN === null
      ? 'There are no affordable homes, so there are no odds to quote.'
      : `Odds for a household that qualifies: 1 in ${fmtInt(r.oddsN)} from these ${total} buildings. About ${fmtInt(r.womenHomes)} of the affordable homes would go to women-led households.`,
    `At ${b.pct}%: ${b.buildingsBuilt} buildings, ${fmtInt(b.newHomes)} new homes, ${fmtInt(b.affordableHomes)} affordable` +
      (b.oddsN === null ? '.' : `, odds 1 in ${fmtInt(b.oddsN)}, about ${fmtInt(b.womenHomes)} to women-led households.`),
    `Of ${women} women-led renter households shown: ${counts.qualifies} qualify, ${counts.too_much} earn too much, ${counts.too_little} earn too little. These counts don't change with the slider.`,
    `${gapCount} of the ${counts.too_much} who earn too much still spend 30%+ of income on rent.`,
  ];
  if (pct !== b.pct) {
    facts.push(
      `Compared with ${b.pct}%: buildings ${changeWords(r.buildingsBuilt, b.buildingsBuilt, '', b.pct).text}; new homes ${changeWords(r.newHomes, b.newHomes, '', b.pct).text}; affordable homes ${changeWords(r.affordableHomes, b.affordableHomes, '', b.pct).text}.`,
    );
  }
  return facts;
}

/**
 * Every number Claude may say. Payload numbers, the 20/100 totals, |result − baseline| differences
 * for each count, the 30% rent threshold, and too_much − gapCount.
 */
export function allowedNumbers(req: ExplainRequest): Set<number> {
  const { pct, result: r, baseline: b, counts, gapCount } = req;
  const s = new Set<number>();
  const add = (n: number | null | undefined) => {
    if (typeof n === 'number' && Number.isFinite(n)) s.add(Math.round(n * 100) / 100);
  };
  add(pct);
  add(b.pct);
  for (const x of [r, b]) {
    add(x.pct); add(x.buildingsBuilt); add(x.newHomes); add(x.affordableHomes); add(x.oddsN); add(x.womenHomes);
    add(x.built.length);
    add(x.built.length - x.buildingsBuilt); // buildings not built
  }
  add(counts.too_much); add(counts.too_little); add(counts.qualifies);
  add(counts.too_much + counts.too_little + counts.qualifies);
  add(counts.too_much + counts.too_little); // left out
  add(gapCount);
  add(counts.too_much - gapCount);
  add(30);
  const diff = (a: number | null, c: number | null) => {
    if (a !== null && c !== null) add(Math.abs(a - c));
  };
  diff(r.buildingsBuilt, b.buildingsBuilt);
  diff(r.newHomes, b.newHomes);
  diff(r.affordableHomes, b.affordableHomes);
  diff(r.womenHomes, b.womenHomes);
  diff(r.oddsN, b.oddsN);
  diff(r.pct, b.pct);
  return s;
}

/** Numbers in a text: "1,400" -> 1400, "$2,269" -> 2269, "8%" -> 8. The "1" of "1 in N" is skipped. */
export function extractNumbers(text: string): number[] {
  const cleaned = text.replace(/\b1 in (?=[\d$])/gi, ' in ');
  const out: number[] = [];
  for (const m of cleaned.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g)) {
    out.push(Number(m[0].replace(/,/g, '')));
  }
  return out;
}

/** The numbers in `text` that aren't allowed by the payload (empty = the text passes). */
export function unknownNumbers(text: string, req: ExplainRequest): number[] {
  const ok = allowedNumbers(req);
  return extractNumbers(text).filter((n) => !ok.has(Math.round(n * 100) / 100));
}

/** True if any banned jargon word appears (case-insensitive, word-ish match). */
export function hasBannedWord(text: string): string | null {
  for (const w of BANNED_WORDS) {
    const re = w === 'AMI' ? /\bAMI\b/ : new RegExp(`\\b${w}`, 'i');
    if (re.test(text)) return w;
  }
  return null;
}

/** Cache key: every number in the payload, so a fixture-era cache is never served against real data. */
export function explainPayloadKey(req: ExplainRequest): string {
  const pick = (x: SliderResult) => [x.pct, x.buildingsBuilt, x.newHomes, x.affordableHomes, x.oddsN, x.womenHomes, x.built.map((v) => (v ? 1 : 0)).join('')];
  return JSON.stringify([req.pct, pick(req.result), pick(req.baseline), req.counts.too_much, req.counts.too_little, req.counts.qualifies, req.gapCount]);
}

/** The SPEC §8 instruction appended to data/claude_context.md. */
export function explainInstruction(total: number): string {
  return [
    '2–3 plain sentences for someone who knows nothing about housing. Use only numbers in the payload. Say who is helped and who is left out, and why (too much / too little / too few homes). Don\'t recommend a policy.',
    'Get the cause right: at every slider setting, most of these women are left out because of income (they earn too much or too little to qualify), and the slider never changes that. Too few homes only affects the ones who qualify, through their odds. Never say that too few homes is why most women are left out.',
    `Also: never use the words AMI, inclusionary, BMR, feasible, feasibility or pencils. Say "gets built" / "not built" instead. When you mention odds, say "from these ${total} buildings", never "per year" or "this year". Use only the numbers given in the facts and payload, written as digits; don't compute new percentages, ratios or totals. Plain text only, no markdown, no lists. Keep it under 75 words.`,
  ].join('\n');
}
