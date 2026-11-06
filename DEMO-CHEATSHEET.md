# Demo cheat sheet (~2.5 min)

All numbers below come from `public/data/meta.json`, `public/data/personas.json` and `lib/sim.ts` (real 2024 Census data; 1 figure = 100 SF women-led renter households, 815 figures). The SPEC.md placeholders are **not** what's on screen.

**Setup:** Chrome at **1440×900**, http://localhost:3000. Reload once before recording (starts at 10%, nothing selected). Escape closes popovers and zooms back out.

---

### 1. Hook (20 s): no clicks
> "In July, SF voted to lower how many affordable homes new buildings must include. I'm a data science intern at SF Planning. This is my own project, and it asks who those homes are actually for."

On screen at 10%: **New homes built 1,400** (in 13 of 20 proposed buildings) · **Affordable homes 141** · **Odds for eligible households 1 in 236**.
> "Each figure is 100 real women-led renter households, from Census records, placed where they actually live."

### 2. Linh (30 s): click the **Linh** chip (legend, bottom-left)
Camera flies to the Outer Richmond; her card: *37 / Outer Richmond / Waitress · Raising 2 kids · $51K a year · Rent takes 50% of her income · Below the minimum income.*
> "Linh is a waitress raising two kids on about $51K. Why doesn't she qualify? Affordable units still charge rent: $2,594 a month for a 1-bedroom, and applicants must earn twice the yearly rent, $62,250. She's $11,488 short."

### 3. Lower it (25 s): click **⟲** (top-right), drag the slider to **5%**
**2,280** new homes (17 of 20 buildings) · **117** affordable · odds **1 in 284**.
> "Require less and more buildings get built: 2,280 new homes instead of 1,400. But fewer affordable ones: 117, so the odds for an eligible household get worse."

### 4. Raise it (25 s): drag to **20%**
**240** new homes (6 of 20) · **48** affordable · odds **1 in 693**.
> "Require too much and buildings stop getting built. Only 48 affordable homes."

### 5. Who they reach (40 s): drag to **8%**, click **Group by eligibility**
**1,850** new homes (15 of 20) · **148** affordable, the most in this simplified model · odds **1 in 225**.
Groups: **Above the income limit 43% (≈34,900 households) · Below the minimum income 41% (≈33,800) · Eligible 16% (≈12,800)**.
> "8% gives the most affordable homes. But look who they reach: 41% of these women earn below the minimum, like Linh, at every setting. 43% are above the limit. Only 16% are eligible, and they face odds of 1 in 225."

### 6. Close (15 s)
> "Feasibility tools tell city leaders how many buildings a rule produces. This shows who the homes are for."

---

**Slider stops:** 10 (start) → 5 → 20 → 8. Keyboard: focus the slider, arrows ±1, PgUp/PgDn ±5.
**Clicks, in order:** Linh chip → ⟲ → slider 5 → slider 20 → slider 8 → Group by eligibility.

**Say this once (it's no longer printed on screen):** "The 20 buildings are made up to show the shape of the tradeoff; income limits and the women are real." (Each building's popover still says "made-up building, simplified model".)

**If asked**
- *Rule:* an affordable studio's rent is set at $2,269/month; a person living alone must earn $54,450–$90,750 to qualify.
- *Women:* anonymized ACS 2024 PUMS records (81,512 SF women-led renter households, shown at 1 figure per 100), names invented, placed within the Census area where each record lives.
- *For scale:* SF completed 1,564 affordable homes in 2025.
- *Prediction?* No. It shows the tradeoff; it doesn't predict.
