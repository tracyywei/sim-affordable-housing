# Demo cheat sheet: Who's Left Out (~3 min)

All numbers below come from `public/data/meta.json`, `public/data/personas.json` and `lib/sim.ts` (real 2024 ACS data). The SPEC placeholders (38 / 27 / 35, "21 still spend", "home health aide", "$10,250 more", "1 in 560") are **not** what's on screen.

**Setup:** desktop browser at **1440×900**, http://localhost:3000 (or the deployed URL). Reload once before recording so the page starts at 10% with nothing selected. Escape at any time closes popovers and zooms back out.

---

### 1. Hook (20 s): no clicks
> "In July, SF voted to lower how many affordable homes new buildings must include. I'm a data science intern at SF Planning. This is my own project, and it asks who those homes are actually for."

On screen at the start (10%, "starting point (not current law)"): **13 of 20** buildings · **141** affordable of **1,400** new · odds **1 in 236**.

### 2. Linh (30 s): click the **Linh** chip (bottom-left, "Meet:")
Camera flies to Excelsior; her card opens: *37 / Excelsior / Waitress · Raising 2 kids · $51K a year · Rent takes 50% of her income · Earns too little to qualify.*
> "This is Linh. She's a real, anonymized Census household; only the name is invented. A waitress raising two kids on about $51K. She earns too *little* for the 'affordable' home: she'd need **$62,250** for an affordable 1-bedroom at **$2,594** a month. That's **$11,488** more than she makes."

### 3. Lower it (30 s): click **⟲** (top-right), then drag the slider to **5%**
Scoreboards: **17 of 20** ("4 more than at 10%") · **117** of 2,280 ("24 fewer than at 10%") · **1 in 284**.
> "Lower the requirement and four more buildings get built, but there are fewer affordable homes: 117 instead of 141."

### 4. Raise it (30 s): drag to **20%**
Scoreboards: **6 of 20** · **48** of 240 · **1 in 693**.
> "Push too hard and buildings stop getting built. Only 48 affordable homes are left."

### 5. The most homes (40 s): drag to **8%**, then click **Line them up** (legend, bottom-left)
Scoreboards: **15 of 20** · **148** of 1,850 (the most, in this simplified model) · **1 in 225** · ≈ **57** to women-led households.
The women walk into three groups: **43 earn too much · 41 earn too little · 16 qualify**.
> "8% gives the most affordable homes: 148. But look who they reach. Of 100 real SF women renting on their own, 43 earn too much, and 9 of them still spend 30% or more of their income on rent, like Priya. 41 earn too little, like Linh. Only 16 qualify, and they face odds of 1 in 225 from these 20 buildings."

### 6. Explain + close (30 s): click **✨ Explain this** (control bar)
At 8% the answer comes from the pre-made cache (instant, labeled "✨ Claude").
> "Feasibility tools tell city leaders how many buildings a rule produces. This shows who the homes are for."

---

**Exact slider stops:** 10 (start) → 5 → 20 → 8. Keyboard alternative: focus the slider, then use the arrows (±1) or PgUp/PgDn (±5).
**Clicks, in order:** Linh chip → ⟲ → slider 5 → slider 20 → slider 8 → Line them up → ✨ Explain this.

**If asked**
- *Are the buildings real?* No. The 20 buildings and their break-even points are made up to show the shape of the tradeoff ("Simplified model" pill, top-left). Income limits are real (MOHCD 2026).
- *Are the women real?* Yes: anonymized ACS 2024 Census records (PUMS), with invented names. Where they appear on the map is illustrative.
- *For scale:* SF completed 1,564 affordable homes in 2025 (ⓘ drawer).
- *Rule:* an affordable studio is $2,269 a month; a woman living alone must earn between $54,450 and $90,750 to qualify.
- *Does it predict anything?* No. It shows the tradeoff, it doesn't predict.
