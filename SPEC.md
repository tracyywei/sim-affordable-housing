# SPEC (FINAL): Who's Left Out
**A map dashboard: one slider for how much affordable housing new SF buildings must include, and which women it actually reaches.**

Code with Claude: Women in AI Hackathon · Fri Nov 6, 2026 · due 12:45 PM
This is the one source of truth. It replaces SPEC v1–v3 and merges `UI-SPEC.md`.

---

## 0. What was reconciled
| Conflict | Final decision |
|---|---|
| Buildings: real pipeline projects (v3) vs. 20 made-up buildings (UI) | **The UI's 20 made-up buildings are canonical** (§4.1). They're illustrative, and the demo path depends on their numbers (checked in §4.3). The real **SF Development Pipeline** data is used only as a reality check on building sizes and the number of affordable homes. |
| "Earns too little" dropped (v3) vs. used throughout the UI | **Kept.** The UI is built on it, and it's Linh's story. Layer 2 becomes an **income range**: too much / too little / qualifies (§5). |
| Who the 100 women are | **100 real anonymized Census records** (PUMS), drawn as a weighted sample of SF's women-led renter households (§5.4). |
| "Jasmine" / the Gap (v3) | Not in the UI. **Added lightly:** Priya is the Gap persona, plus one line in the legend (§5.5, §9.6). No new panel. |
| Claude persona stories (v3) vs. templates only (UI) | **Templates only.** Claude's only job is ✨ Explain this (§8). |
| Odds "1 in 560 **this year**" | Changed to **"from these 20 buildings"**. We don't model a year. |
| Group bars, tradeoff chart, 10,000-dot Sieve, scrollytelling | **Dropped.** |
| Neighborhood dataset id `j2bu-swwd` ("verify") | **Use `p5b7-5n3h`** (Analysis Neighborhoods, confirmed via DataSF crosswalk links). The fetch script tries both. |

---

## 1. The idea
SF requires new apartment buildings to set aside a share of their homes as **affordable**. Those homes have capped rent, and only people within an income range can rent them. One slider sets that share, and the dashboard shows two layers:

1. **How many affordable homes exist.** Slider % × homes in the buildings that still get built. Push the % too high and developers walk away.
2. **Which women can get one.** The same 100 real SF women each time. Each one earns too much, earns too little, or qualifies. The qualifiers share the few homes, so their chance is "1 in N."

**Hook:** SF's Board of Supervisors approved lowering these requirements on July 21, 2026 (sfplanning.org).
**Pitch line:** "Feasibility tools tell city leaders how many buildings a rule produces. This shows who those homes are for."
**Existing tools** (say so if asked): Grounded Solutions' Inclusionary Housing Calculator, Terner Labs' Housing Policy Simulator, and the SF Controller's feasibility studies model *whether it gets built*, not *who it reaches*.

---

## 2. Plain-language rule
Judges aren't housing people. There's no jargon on screen; terms like AMI and inclusionary appear only in the ⓘ drawer.

| Internal | On screen |
|---|---|
| Inclusionary % | "Share of new homes that must be affordable" |
| Feasible / pencils | "Gets built" / "Not built" |
| Income above the limit | "Earns too much" |
| Income below 2× rent | "Earns too little" |
| Within the range | "Qualifies" |
| Rent-burdened above the limit | "Earns too much to qualify, but rent still takes 30%+ of her income" |

---

## 3. Architecture
Next.js + TypeScript on Vercel. The simulation is a set of pure functions in the browser. **All 26 slider values (0–25%) are precomputed on load** into a lookup table that the UI animations read. One server route, `/api/explain`, calls Claude; the key stays server-side.

```
app/page.tsx · app/api/explain/route.ts
lib/types.ts ★ · lib/constants.ts · lib/sim.ts (precompute) · lib/layout.ts · lib/camera.ts
components/map/  SfMap · Neighborhoods · Person · Building · Popover
components/hud/  TitleBlock · ZoomControls · ControlBar · Scoreboards · AffordableCard
                 Legend (+ Line them up) · PersonaChips · ClaudeBubble · InfoDrawer
public/data/  sf-neighborhoods.geojson · women100.json · personas.json
data/         claude_context.md · validation.json · targets.json
scripts       fetch_data.sh · build_data.py
```
Dependencies: `d3-geo`, `d3-zoom`, `d3-selection`, `d3-transition`, `d3-ease`, `d3-delaunay` (polish only).

---

## 4. Layer 1: buildings and affordable homes

### 4.1 The 20 buildings (illustrative; the names are made up)
Each building has a size and a **break-even %**, the highest share it can set aside and still get built. A value of −1 means it doesn't get built even at 0%. That matches the Controller's 2023 finding that many prototypes were infeasible even with no requirement.

| # | breakEven, units | Name | Neighborhood |
|---|---|---|---|
| 1 | −1, 120 | Lakeview Commons | Lakeshore |
| 2 | −1, 80 | Ocean Ave Lofts | Outer Mission |
| 3 | 3, 200 | Folsom Yards | South of Market |
| 4 | 5, 250 | Channel Point | Mission Bay |
| 5 | 6, 180 | Brannan Works | South of Market |
| 6 | 8, 300 | Harbor Terrace | Financial District/South Beach |
| 7 | 9, 150 | 18th St Flats | Mission |
| 8 | 10, 220 | Market Octavia A | Hayes Valley |
| 9 | 11, 160 | Third St Gardens | Bayview Hunters Point |
| 10 | 12, 260 | Island Cove | Treasure Island |
| 11 | 13, 140 | Potrero Rise | Potrero Hill |
| 12 | 14, 190 | Van Ness Court | Western Addition |
| 13 | 16, 100 | Geneva Place | Excelsior |
| 14 | 18, 90 | Taraval Homes | Sunset/Parkside |
| 15 | 20, 40 | Larkin Studios | Tenderloin |
| 16 | 21, 30 | Mission Street A | Mission |
| 17 | 22, 60 | Cortland Row | Bernal Heights |
| 18 | 24, 25 | Clement Corner | Outer Richmond |
| 19 | 30, 35 | Irving Walk | Inner Sunset |
| 20 | 40, 50 | Bayshore Commons | Visitacion Valley |

### 4.2 Rules
- `built(b, p) = breakEven_b ≥ p`
- `affordableHomes(p) = Σ over built buildings of Math.round(units × p / 100)`
- In the UI, each building's teal windows = `round(20 × p / 100)` out of 20.

### 4.3 Checked values (the demo depends on these)
| % | Buildings built | New homes | Affordable |
|---|---|---|---|
| 0 | 18 | 2,480 | 0 |
| 5 | 17 | 2,280 | 117 |
| **8** | 15 | 1,850 | **148 ← the most** |
| 10 (starting point) | 13 | 1,400 | 141 |
| 15 | 8 | 430 | 66 |
| 20 | 6 | 240 | 48 |
| 25 | 2 | 85 | 22 |

The 10% starting point is labeled "starting point (not current law)." SF's real requirements vary by project size and have changed.

### 4.4 Reality check (from real data, shown in the ⓘ drawer)
From `build_data.py`: the typical size of SF pipeline projects with 25+ units (DataSF `6jgi-cpb4`), and recent affordable/BMR homes completed per year (Housing Production `xdht-4php`, MOHCD pipeline `aaxw-2cb8`). It goes in the drawer as one line: *"For scale: SF completed N affordable homes through this program in [year]."*

---

## 5. Layer 2: which women can get one

### 5.1 The income range (MOHCD 2026, 80% of area median income)
- **Upper limit** (by household size): `limit(size) = round50(0.80 × round50(162,100 × F[size]))`, with `F = .70, .80, .90, 1.00, 1.08, 1.16, 1.24, 1.32` for 1–8 people. MOHCD rounds the 100% figure to the nearest $50 first.
  That gives 1 person $90,750 · 2 people $103,750 · 3 people $116,700 · 4 people $129,700.
- **Her home size:** 1 person → studio · 2–3 → 1-bedroom · 4–5 → 2-bedroom · 6+ → 3-bedroom.
- **Capped rent:** `rent(bedrooms) = 0.30 × limit(bedrooms + 1) / 12` (a studio uses 1 person).
  That gives studio **$2,269** · 1BR **$2,594** · 2BR **$2,918** · 3BR **$3,243** a month.
- **Lower limit:** `floor = 2 × 12 × rent`, so studio **$54,450** · 1BR **$62,250** · 2BR **$70,000** · 3BR **$77,800** (rounded to $50).
  **ASSUMPTION, verify against MOHCD's Inclusionary Procedures Manual.** Housing-voucher holders are usually exempt from this floor; that's out of scope and noted in the drawer.

### 5.2 Status (per woman; doesn't change with the slider)
```
income > limit(size)   → "Earns too much"
income < floor(home)   → "Earns too little"
otherwise              → "Qualifies"
```

### 5.3 Odds (changes with the slider)
- `qualifiers` = weighted count of **all** SF renter households (any household type) within their income range, from PUMS. The lottery isn't women-only.
- `odds(p) = qualifiers ÷ affordableHomes(p)` → shown as **"1 in N"** (∞ / "no homes" at 0%).
- `womenHomes(p) = affordableHomes(p) × (women-led share of qualifiers)`, shown as the odds card's comparison line: *"≈ 52 of these homes would go to women-led households."*

### 5.4 The 100 women (`women100.json`)
- **Population:** SF **women-led renter households** from ACS PUMS (female householder, no spouse or partner: HHT2 codes 5–8; renter: TEN 3–4).
- Compute each record's status (§5.2), then choose 100 so the group counts match the weighted shares (largest-remainder rounding). Within each group, use **systematic weighted sampling**. Every figure is a real anonymized record (income, household size, age, rent).
- **Neighborhood placement is illustrative.** PUMS only knows large areas, so §10.3 places figures randomly within residential neighborhoods.
- Hover text comes from the record: *"Woman, 2 people at home, earns $74K · Qualifies."*

### 5.5 Personas (`personas.json`): the closest real PUMS record to each profile; card numbers come from the record
| Name | Profile to match | Status | Pinned in |
|---|---|---|---|
| **Linh** | ~38, raising 2 kids (3 people), ~$52K, rent ~55% of income | Earns too little (needs $62,250 for a 1BR) | Excelsior |
| **Rosa** | ~67, lives alone, ~$31K | Earns too little (needs $54,450 for a studio) | Mission |
| **Ana** | ~29, lives alone, ~$65–75K | Qualifies, odds 1 in N | Sunset/Parkside |
| **Priya** | lives alone, ~$95–100K, rent ≥30% of income | **The Gap:** earns too much, rent still takes 30%+ | Mission Bay |

Names are invented, and so are jobs unless they come from the record's occupation code (OCCP). On screen: "Based on a real, anonymized Census household."

### 5.6 The Gap (from v3, kept small)
`gap` = women-led renters above the upper limit who pay ≥30% of income on rent. It's shown only as **one line under "Earns too much" in the legend** (*"21 of them still spend 30%+ of income on rent"*) and in Priya's card.

---

## 6. Precomputed result shape (`lib/types.ts`)
```ts
type Status = 'too_much' | 'too_little' | 'qualifies';
interface Woman { id: string; size: number; income: number; age: number; rentShare: number | null;
  status: Status; gap: boolean; persona?: 'Linh'|'Rosa'|'Ana'|'Priya'; x?: number; y?: number; }
interface SliderResult { pct: number; buildingsBuilt: number; newHomes: number; affordableHomes: number;
  built: boolean[]; oddsN: number | null; womenHomes: number; }
interface AppData { women: Woman[]; results: SliderResult[]; /* index = pct 0..25 */
  counts: Record<Status, number>; gapCount: number; qualifiers: number; womenShareOfQualifiers: number; }
```

---

## 7. Data pipeline (run once on a Mac; the build sandbox can't reach these sites)
```bash
bash fetch_data.sh && python3 build_data.py
```
| Dataset | Source | Used for |
|---|---|---|
| ACS PUMS (SF PUMAs, householder records) | Census API | **The 100 women, personas, qualifiers, odds, gap** |
| ACS tables B11012, B25003, B25070, B25118, B17012, B19126, B25009, B25011, B25031 | Census API | `validation.json`: our weighted data vs. published SF figures (drawer) |
| Analysis Neighborhoods GeoJSON | DataSF `p5b7-5n3h` | The map (simplify with mapshaper to under 200 KB) |
| SF Development Pipeline | DataSF `6jgi-cpb4` | Reality check (§4.4) |
| Housing Production 2005–present | DataSF `xdht-4php` | Reality check (§4.4) |
| MOHCD Affordable Housing Pipeline / Portfolio | DataSF `aaxw-2cb8` / `pyxv-n29e` | Reality check / context |
| MOHCD 2026 income limits | sf.gov | §5.1 |
| SF Controller Triennial Feasibility Report 2023 | sf.gov | Justifies the break-even shape (drawer) |
| GEPI Women & Housing in CA 2024; SF.gov Poverty in SF | web | Context facts for Claude and the pitch (CA-wide figures labeled) |

**Fallback if PUMS fails:** generate 100 women from published shares with a fixed seed, and label them "synthetic, based on Census statistics."

---

## 8. Claude: ✨ Explain this (the only Claude feature)
- `POST /api/explain` with `{pct, the SliderResult, the same at 10%, counts, gapCount}`.
- The system prompt is `data/claude_context.md` plus: *"2–3 plain sentences for someone who knows nothing about housing. Use only numbers in the payload. Say who is helped and who is left out, and why (too much / too little / too few homes). Don't recommend a policy."*
- The UI shows a **template sentence instantly**, then cross-fades to Claude's text. Pre-cache answers for 5%, 8%, 10% and 20% for the demo. Timeout 8 s → *"Claude's taking a nap; here's the quick version:"* + template.

---

## 9. UI (from UI-SPEC, reconciled)

**The map is the dashboard.** A hand-drawn SF map fills the screen. The 20 buildings and 100 women sit on it as drawn figures, and the controls float over it. Inspired by The Pudding: warm paper, flat illustrated geography, little clickable people, pill controls with chunky outlines. Target is desktop at 1440×900 (the demo is a recorded video).

### 9.1 Layout
```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ WHO'S LEFT OUT  (hand-lettered)                                          [+] [−] [⟲]     │
│ How much affordable housing should new SF buildings include?             ┌────────────┐  │
│ (ⓘ Simplified model)                                                     │🏢 BUILDINGS│  │
│                                                                          │ 13 of 20   │  │
│              ~~~~ bay ~~~~         ░░ SF neighborhoods ░░                ├────────────┤  │
│        👤        🏢          👤    👤                                     │🏠 AFFORD.  │  │
│    👤      👤        🏢 Folsom Yards   👤                                 │ 141 of     │  │
│        👤   Linh◎       👤      🏢                                        │ 1,400 new  │  │
│   👤          👤   🏢      👤       👤                                     ├────────────┤  │
│        👤        👤    (ghost 🏢: not built)                              │🎟 ODDS     │  │
│ ┌ WHO THESE 100 WOMEN ARE ────┐                                          │ 1 in N     │  │
│ │ ● Earns too much      38    │                                          │ ≈52 homes  │  │
│ │   21 still spend 30%+ on rent│                                         │ to women   │  │
│ │ ● Earns too little    27    │                                          ├────────────┤  │
│ │ ● Qualifies           35    │                                          │ WHAT       │  │
│ │ [ Line them up ]            │                                          │ "AFFORD-   │  │
│ │ Meet: Linh · Rosa · Ana · Priya                                        │ ABLE" MEANS│  │
│ └─────────────────────────────┘                                          └────────────┘  │
│         ┌──────────────────────────────────────────────────────────────┐                 │
│         │ Share of new homes that must be affordable          [ 10% ]  │                 │
│         │ 0% ─────────●──────────────────── 25%   ▲ starting point     │                 │
│         │ "In a 100-apartment building, 10 must be affordable."        │                 │
│         │                                         [ ✨ Explain this ]   │                 │
│         └──────────────────────────────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
*All counts shown are placeholders until `build_data.py` runs.*

| Region | Position | Contents |
|---|---|---|
| Title block | top-left, 24 px inset | Hand-lettered title, subtitle, "ⓘ Simplified model" pill (opens the drawer) |
| Zoom controls | top-right | +, −, ⟲ reset |
| Right rail | right, 300 px, from top 96 px | 3 scoreboards, then the "What affordable means" card |
| Legend card | bottom-left | Status counts + gap line, "Line them up," persona chips |
| Control bar | bottom-center, 640 px pill | Slider, live sentence, Explain |
| Claude bubble | above the control bar | §9.5 |
| Popovers | anchored to the clicked figure | §9.3, §9.4 |

Map fit: `fitExtent([[24, 120], [W − 340, H − 180]], sf)`.

### 9.2 Visual system
**Colors**
| Token | Hex | Use |
|---|---|---|
| `--paper` | `#F6F1E7` | background |
| `--bay` | `#7FB2DE` | water (SVG background) |
| `--land-1…5` | `#B9C4A0` · `#D9C9A3` · `#C9A27E` · `#9FAF8A` · `#C8C2B4` | neighborhoods, by index |
| `--border` | `#FFFFFF` 70% | 1.25 px dotted neighborhood borders |
| `--ink` | `#2B2B2B` | text, outlines |
| `--card` | `#FFFFFF` | cards |
| `--too-much` | `#6B7A8F` | earns too much |
| `--too-little` | `#D9682B` | earns too little |
| `--qualifies` | `#1F8A8A` | qualifies **and** affordable windows (same on purpose) |
| `--lit` | `#F7D774` | market-rate windows |
| `--persona` | `#E85D9F` / bg `#FAD4F5` | persona rings, tags, popover |

Status is never shown by color alone. Check the palette with the dataviz skill's validator.

**Type** (`next/font/google`): Permanent Marker 40 px for the title; Caveat 18–32 px for annotations; Atkinson Hyperlegible for everything else (body 15 px, labels 12 px uppercase, scoreboard numbers 36 px bold `tabular-nums`).

**Cards:** white, 2 px ink border, 14 px radius, offset shadow `3px 3px 0 var(--ink)` (it shifts on press). No gradients or blur.

**Hand-drawn touches:** paper grain (feTurbulence at 6%); wobbly neighborhood borders only (displacement scale 1.5, never on text); polish: about 600 Voronoi land cells ±4% lightness.

**Whimsy rule: whimsy goes in the craft, never in the outcomes.** People's results stay sincere: no jokes in persona cards, nothing bouncy on "earns too little."
- Title at −2°, cards tilted ±0.6° (straighten on hover). At most 3 Caveat annotations: "drag me!" by the slider (fades after the first drag), "this is Linh", and a self-drawing circle around the odds whenever they change.
- Map life (pointer-events none, aria-hidden): fog drifting over the Sunset/Richmond (40 s loop), bay wave doodles, a sailboat every 30 s, a tiny Golden Gate doodle.
- People: 1 px idle bob (3 s, seeded delay), a 3 px hop on hover, figures turn to face a selected building, a walking leg cycle during Line them up.
- Buildings: a crane doodle while growing, dust puffs when shrinking, windows lighting one by one (30 ms).
- Controls: a little-house slider thumb (tilts ±4° while dragging), a % pill bounce, odometer scoreboard digits (4% overshoot), a twinkling ✨ while Claude thinks.
- Chrome copy: ⟲ "back to the whole city" · "esc to zoom out".

### 9.3 Map, camera, figures
- **Map:** Analysis Neighborhoods → `d3.geoMercator().fitExtent`. Neighborhood labels in 11 px uppercase at 50%, only when zoomed past 2×.
- **Camera:** `d3-zoom`, 1–8×, pan clamped to SF. On load, 0.85× → 1× over 1.5 s (the only intro). Fly-to is 750 ms to 4×, then the popover opens. ⟲ or Escape resets. Figures counter-scale (`1/k`, growing slightly up to 1.6×) and use `vector-effect: non-scaling-stroke`.
- **Placement** (`lib/layout.ts`, seeded): women go into residential neighborhoods (skip Golden Gate Park, Presidio, Lincoln Park, McLaren Park) via rejection sampling, at least 14 px apart. Buildings use the neighborhoods in §4.1. Personas are pinned per §5.5.
- **Person:** about 18 px tall: head r=3.2, body 7×9 rect in the status color, ink legs, shadow. Seeded height ±10%, 3 hair shapes. Personas get a pink ring and a name tag. Hover shows a tooltip; click flies to her and opens a small popover.
- **Building:** small (<75 units) 28 px, medium 40 px, large (>175) 54 px tall, 22 px wide. Facade `#FFF8EC` with a 4×5 window grid: teal = `round(20 × p/100)` filled from the bottom, the rest `--lit`. Not built: dashed outline at 35% with a "✕ not built" tag on hover.

### 9.4 Popovers
**Persona** (pink card, pointer toward her figure). The numbers come from her PUMS record, and the text is a template:
```
38 / Excelsior / Home health aide          ✕
Raising 2 kids · $52K a year
Rent takes 55% of her income
───────────────────────────────────────────
● Earns too little to qualify
Linh would need to earn $62,250 for an affordable
1-bedroom ($2,594/month). That's $10,250 more than she makes.
```
Templates by status:
- *too_little:* "would need $F… that's $X more than she makes."
- *qualifies:* "She can apply. With N people competing for every home, her odds are 1 in N."
- *too_much + gap (Priya):* "She earns $X over the limit for her household size, but rent still takes P% of her income. This rule can't help her."

**Building:** *"Folsom Yards · South of Market · 200 apartments / At 10%: ✕ Not built. The developer says it doesn't make enough money at this level (made-up numbers, simplified model). It gets built up to 3%."* When built: *"✓ Built · 22 of its 200 apartments are affordable."*

### 9.5 Panels
- **Control bar:** the label "Share of new homes that must be affordable" with a `[10%]` pill; a 0–25 range, step 1, house thumb; wavy ticks at 0/5/10/15/20/25; "▲ starting point (not current law)" under 10%; the live sentence *"In a 100-apartment building, 10 must be affordable."*; ✨ Explain this. Keys: arrows ±1, PgUp/PgDn ±5.
- **Right rail scoreboards:** 🏢 **Buildings** "13 of 20" · 🏠 **Affordable homes** "141 of 1,400 new" · 🎟 **Odds** "1 in N" + "≈ W of these homes go to women-led households". Each shows the change vs. 10% in words (teal for more homes, orange for fewer). At 0 buildings, an orange banner: *"At this level no building gets built (simplified model)."* At 0%, odds read *"No affordable homes required."*
- **"What 'affordable' means here" card:** *"An affordable studio costs **$2,269 a month**. To get one, a woman living alone must earn between **$54,450 and $90,750**. Family of 3: $62,250–$116,700 for a 1-bedroom."* Below it, a $0–$150K bar with a teal band and a tick for the selected persona (default Linh, in orange, just left of the band).
- **Claude bubble:** a white speech bubble (max 520 px, 16 px text) with its tail toward Explain. The template appears instantly and cross-fades to Claude's text with a "✨ Claude" label. It closes on ✕ or when the slider moves.
- **Legend:** "WHO THESE 100 WOMEN ARE" with three rows (figure icon, label, count). The **gap line** goes under Earns too much. The Qualifies row adds "odds: 1 in N."
  - **Line them up:** land and buildings fade to 25%. The 100 figures walk (800 ms, 5 ms stagger) into three blocks with big Caveat counts. Under the qualify block: *"For them, the odds are 1 in N from these 20 buildings."* The button becomes "Back to the map."
  - Persona chips (Linh · Rosa · Ana · Priya) fly to each woman.
- **Info drawer (ⓘ):** 420 px from the left. Contents: §5.1 assumptions and formulas, §4.1 building table ("made up"), §4.4 reality check, `validation.json` table, the "Neighborhood placement is illustrative" and "Women are real anonymized Census records with invented names" notes, and sources.
- **Slider caption:** after 600 ms still, show *"Same 100 women. Moving the slider doesn't change who qualifies, only how many homes there are."* for 3 s.

### 9.6 Interaction states
| State | Map | Panels |
|---|---|---|
| Default | 1×, all figures | all visible |
| Selected | 4× fly-to, others at 60% | popover; Esc/⟲ closes |
| Line them up | land/buildings 25%, 3 blocks, zoom off | button: "Back to the map" |
| Dragging | buildings grow/shrink | scoreboards roll; Claude bubble closes |
| Claude loading | — | template + pulsing ✨ |

### 9.7 Motion and accessibility
- `prefers-reduced-motion`: jumps instead of flights, no stagger, instant building swaps, all whimsy motion off (each element shows its final state).
- Whimsy layers are `aria-hidden`. Tab order: slider → Explain → persona chips → Line them up → zoom → ⓘ. Buildings and the 4 personas are focusable `<g role="button">`; the legend is the text equivalent for the other 96 women.
- Popovers don't trap focus and close on Escape. Text contrast ≥ 4.5:1.
- Under 900 px wide: the rail becomes a scroll row, the legend collapses to one line, the control bar goes full width, popovers become bottom sheets.

---

## 10. Build plan (11:15 → 12:45, two parallel tracks)
| Time | Data/Sim (A) | UI (B) |
|---|---|---|
| 11:15–11:25 | Run `fetch_data.sh` + `build_data.py`; check pipeline columns and validation | GeoJSON simplified; `SfMap` with tokens, bay, dotted borders |
| 11:25–11:45 | `women100.json` + `personas.json` (statuses, gap, sampling); `lib/sim.ts` precompute; agree on `types.ts` | Placement + Person + Building against a fixture |
| 11:45–12:05 | `/api/explain` + `claude_context.md` + 4 cached answers | Control bar, rail, legend wired to real data; building grow/shrink |
| 12:05–12:20 | Info drawer content, tests (§11) | Camera, popovers, chips, Line them up |
| 12:20–12:30 | **Together:** two demo dry runs | Whimsy pass (cheapest first) |
| 12:30–12:45 | Record the video, push, submit | |

**Cut order:** Voronoi → odometer → crane/dust → sailboat/bridge → figures facing buildings → wobbly borders → Line them up animation (keep the counts) → load settle → building grow/shrink (instant swap).
**Keep even if behind:** card tilts, idle bob, house thumb, "drag me!".
**Never cut:** SF map, status-colored figures, built/not-built buildings, control bar, scoreboards, persona popovers, "Simplified model" pill, Explain with a template fallback.

---

## 11. Tests (vitest, tiny)
1. The income limit formula reproduces MOHCD 2026 values ($90,750 / $103,750 / $116,700 / $129,700).
2. Rent and floor: studio $2,269 / $54,450; 1BR $2,594 / $62,250.
3. The §4.3 table: 5% → 17 built / 117 affordable; 8% → 148; 10% → 13 / 1,400 / 141.
4. Status counts in `women100.json` sum to 100 and match the weighted shares ±1.
5. Buildings built never increases as % rises.

---

## 12. Demo (~3 min)
1. **Hook (20 s):** "In July, SF voted to lower how many affordable homes new buildings must include. I'm a data science intern at SF Planning. This is my own project, and it asks who those homes are actually for."
2. **Linh (30 s):** click the **Linh** chip; the camera flies to Excelsior. "A home health aide raising two kids. She earns too *little* for the 'affordable' home: she'd need $62,250."
3. **Lower it (30 s):** ⟲, drag to **5%**. Four ghost buildings rise (13 → 17), but affordable homes drop to 117.
4. **Raise it (30 s):** drag to **20%**. Buildings shrink into their foundations, leaving 48 affordable homes.
5. **The most homes (40 s):** drag to **8%** (148, the most). Click **Line them up**: "Even at the best setting: 38 earn too much (and 21 of them still struggle with rent, like Priya), 27 earn too little, and the 35 who qualify face odds of 1 in N."
6. **Explain + close (30 s):** ✨ Explain this. "Feasibility tools tell city leaders how many buildings a rule produces. This shows who the homes are for."

---

## 13. Honesty
- The "Simplified model" pill is always visible. Buildings, break-even points and their names are made up. Income limits are real (MOHCD 2026). Women are real anonymized Census records with invented names. Neighborhood placement is illustrative.
- The 2× income floor and the home-size rule are assumptions to verify.
- Say "shows the tradeoff," never "predicts." Claude explains; it doesn't recommend.
- GEPI figures are California-wide.

## Sources
- MOHCD 2026 inclusionary income limits: https://www.sf.gov/reports--may-2024--income-and-rent-limits-inclusionary-rental-units
- MOHCD 2026 AMI chart: https://media.api.sf.gov/documents/2026_AMI-IncomeLimits-HMFA.pdf
- SF Planning, Inclusionary program (July 21, 2026 legislation): https://sfplanning.org/project/inclusionary-affordable-housing-program
- SF Controller Triennial Feasibility Report 2023: https://sf.gov/sites/default/files/2023-06/Triennial%20Economic%20Feasibilty%20Report%202023.pdf
- Grounded Solutions calculator (ABAG): https://abag.ca.gov/technical-assistance/inclusionary-housing-calculator
- ULI SF + Terner Labs simulator: https://fall.uli.org/?p=3373
- DataSF Analysis Neighborhoods: https://data.sfgov.org/d/p5b7-5n3h
- GEPI Women & Housing in CA 2024: https://thegepi.org/data-brief-women-and-housing-in-california-2024/
- SF.gov Poverty in SF: https://sf.gov/data/poverty-san-francisco
