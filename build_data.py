#!/usr/bin/env python3
"""
Who's Left Out: turn data/raw/* into the small files the app and Claude use.

Run after fetch_data.sh, from your project root:   python3 build_data.py
Standard library only (no pandas needed).

Writes:
  data/households.json          SF householders from ACS PUMS (real, anonymized, weighted; not used by the app)
  data/projects.json            real SF pipeline projects >= 25 units (cost fields = ILLUSTRATIVE; not used by the app)
  public/data/women100.json, personas.json, meta.json   the 100 women, 4 personas, counts/odds (SPEC §5)
  data/targets.json             ACS county stats (every variable of every table, with labels)
  data/validation.json          PUMS-weighted vs ACS published, for the "it matches" check
  data/claude_context.md        compact fact sheet to paste into Claude system prompts
"""
import csv, json, os, random, re, statistics, sys
from collections import defaultdict

RAW = "data/raw"
os.makedirs("public/data", exist_ok=True)
os.makedirs("data", exist_ok=True)
random.seed(42)

def exists(p): return os.path.exists(os.path.join(RAW, p))
def load_json(p): return json.load(open(os.path.join(RAW, p)))
def num(x):
    try: return float(x)
    except (TypeError, ValueError): return None

YEAR = open(os.path.join(RAW, "acs_year.txt")).read().strip() if exists("acs_year.txt") else None
assert YEAR, "data/raw/acs_year.txt missing: run bash fetch_data.sh first"

# ---------------------------------------------------------------- 1. ACS tables
targets = {}
for f in sorted(os.listdir(RAW)) if os.path.isdir(RAW) else []:
    m = re.match(r"acs_(B\d+)\.json$", f)
    if not m: continue
    t = m.group(1)
    try:
        hdr, row = load_json(f)[:2]
        labels = load_json(f"acs_{t}_labels.json").get("variables", {}) if exists(f"acs_{t}_labels.json") else {}
    except Exception as e:
        print(f"  ! could not parse {f}: {e}"); continue
    for k, v in zip(hdr, row):
        if k.endswith("E") and k.startswith(t):
            lab = labels.get(k, {}).get("label", k).replace("Estimate!!", "").replace("!!", " > ")
            targets[k] = {"table": t, "label": lab, "value": num(v), "year": YEAR, "source": f"ACS 1-year {YEAR}, SF County"}
json.dump(targets, open("data/targets.json", "w"), indent=1)
print(f"ACS: {len(targets)} estimates from {len({v['table'] for v in targets.values()})} tables -> data/targets.json")

def acs(var):
    return targets.get(var, {}).get("value")
def acs_find(table, *needles):
    """first variable in table whose label contains all needles (case-insensitive)"""
    for k, v in targets.items():
        if v["table"] == table and all(n.lower() in v["label"].lower() for n in needles):
            return v["value"], v["label"]
    return None, None

# ---------------------------------------------------------------- 2. PUMS households
households = []
if exists("pums_sf_householders.json"):
    rows = load_json("pums_sf_householders.json")
    h, data = rows[0], rows[1:]
    ix = {c: i for i, c in enumerate(h)}
    g = lambda r, c: r[ix[c]] if c in ix else None
    for r in data:
        w = num(g(r, "WGTP")) or 0
        if w <= 0: continue
        hht2 = int(num(g(r, "HHT2")) or 0)
        hh_type = ("couple_led" if hht2 in (1, 2, 3, 4) else
                   "women_led" if hht2 in (5, 6, 7, 8) else
                   "men_led"   if hht2 in (9, 10, 11, 12) else "unknown")
        adj = (num(g(r, "ADJINC")) or 1_000_000) / 1_000_000
        inc = (num(g(r, "HINCP")) or 0) * adj
        ten = int(num(g(r, "TEN")) or 0)
        renter = ten in (3, 4)
        rent = num(g(r, "GRNTP")) if renter else None
        households.append({
            "id": len(households),
            "serial": g(r, "SERIALNO"),
            "weight": w,
            "hhType": hh_type,
            "size": int(num(g(r, "NP")) or 1),
            "kids": int(num(g(r, "NOC")) or 0),
            "singleParent": hht2 in (6, 10),
            "livesAlone": hht2 in (5, 9),
            "householderAge": int(num(g(r, "AGEP")) or 0),
            "householderSex": "F" if g(r, "SEX") == "2" else "M",
            "income": round(inc),
            "renter": renter,
            "rentMonthly": round(rent) if rent and rent > 0 else None,
            "rentBurden": round(rent * 12 / inc, 3) if rent and inc > 0 else None,
            "bedrooms": int(num(g(r, "BDSP")) or 0),
            "limitedEnglish": g(r, "LNGI") == "2",
            "disability": g(r, "DIS") == "1",
            "puma": g(r, "PUMA") or g(r, "public use microdata area"),
            "occp": g(r, "OCCP"),
        })
    json.dump(households, open("data/households.json", "w"))
    W = sum(x["weight"] for x in households)
    print(f"PUMS: {len(households)} SF householder records (weights sum {W:,.0f}) -> data/households.json")
else:
    print("PUMS: not found — keep the generated-households plan from SPEC.md §6.1")


# ---------------------------------------------------------------- 2b. Layer 2: status, 100 women, personas (SPEC §5)
F = [None, .70, .80, .90, 1.00, 1.08, 1.16, 1.24, 1.32]
r50 = lambda x: int(50 * round(x / 50))
def limit(size): return r50(0.80 * r50(162100 * F[min(max(size, 1), 8)]))   # MOHCD rounds 100% first, then 80%
def home_br(size): return 0 if size <= 1 else 1 if size <= 3 else 2 if size <= 5 else 3
def rent(br): return 0.30 * limit(br + 1) / 12
def floor_inc(br): return r50(2 * 12 * rent(br))
def status(x):
    if x["income"] > limit(x["size"]): return "too_much"
    if x["income"] < floor_inc(home_br(x["size"])): return "too_little"
    return "qualifies"
assert limit(1) == 90750 and limit(4) == 129700 and floor_inc(0) == 54450 and floor_inc(1) == 62250

if households:
    renters = [x for x in households if x["renter"]]
    for x in renters:
        x["status"] = status(x)
        x["gap"] = x["status"] == "too_much" and (x["rentBurden"] or 0) >= 0.30
    qualifiers = sum(x["weight"] for x in renters if x["status"] == "qualifies")
    wq = sum(x["weight"] for x in renters if x["status"] == "qualifies" and x["hhType"] == "women_led")
    women = [x for x in renters if x["hhType"] == "women_led"]
    strata = {"too_much_gap": [x for x in women if x["gap"]],
              "too_much": [x for x in women if x["status"] == "too_much" and not x["gap"]],
              "too_little": [x for x in women if x["status"] == "too_little"],
              "qualifies": [x for x in women if x["status"] == "qualifies"]}
    Wtot = sum(x["weight"] for x in women)
    raw = {k: 100 * sum(x["weight"] for x in v) / Wtot for k, v in strata.items()}
    n = {k: int(v) for k, v in raw.items()}
    for k in sorted(raw, key=lambda k: -(raw[k] - n[k]))[: 100 - sum(n.values())]: n[k] += 1
    def systematic(pool, k):
        if k == 0 or not pool: return []
        pool = sorted(pool, key=lambda x: x["income"]); W = sum(x["weight"] for x in pool)
        out, c, i = [], 0, 0
        for j in range(k):
            t = (j + 0.5) * W / k
            while c + pool[i]["weight"] < t and i < len(pool) - 1: c += pool[i]["weight"]; i += 1
            out.append(pool[i])
        return out
    picked = {k: systematic(v, n[k]) for k, v in strata.items()}
    # personas: closest real record to each profile (SPEC §5.5)
    profiles = {
      "Linh":  ("too_little",   lambda x: x["size"] == 3 and x["singleParent"], 52000, 38),
      "Rosa":  ("too_little",   lambda x: x["size"] == 1 and x["householderAge"] >= 62, 31000, 67),
      "Ana":   ("qualifies",    lambda x: x["size"] == 1, 70000, 29),
      "Priya": ("too_much_gap", lambda x: x["size"] == 1, 98000, 33)}
    personas = {}
    for name, (st, ok, inc, age) in profiles.items():
        pool = [x for x in strata[st] if ok(x)] or strata[st]
        if not pool: print(f"  ! no record for persona {name}"); continue
        best = min(pool, key=lambda x: abs(x["income"] - inc) / 10000 + abs(x["householderAge"] - age) / 10)
        personas[name] = best
        if not any(x is best for x in picked[st]) and picked[st]:   # make sure she is among the 100
            taken = [id(v) for v in personas.values()]
            j = next((i for i in range(len(picked[st]) - 1, -1, -1) if id(picked[st][i]) not in taken), None)
            if j is not None: picked[st][j] = best
    women100 = []
    for st, lst in picked.items():
        for x in lst:
            pname = next((k for k, v in personas.items() if v is x), None)
            women100.append({"id": f"w{len(women100)}", "serial": x["serial"], "size": x["size"], "kids": x["kids"],
                "income": x["income"], "age": x["householderAge"], "rentMonthly": x["rentMonthly"],
                "rentShare": x["rentBurden"], "status": x["status"], "gap": x["gap"], "occp": x["occp"],
                "persona": pname, "homeBedrooms": home_br(x["size"]), "limit": limit(x["size"]),
                "floor": floor_inc(home_br(x["size"]))})
    # SPEC §4.4 "For scale": affordable homes completed through the inclusionary program in the latest full year
    forScale = None
    if exists("housing_production_2005_present.csv"):
        hp = list(csv.DictReader(open(os.path.join(RAW, "housing_production_2005_present.csv"), encoding="utf-8-sig")))
        c_year, c_aff, c_type = "BMR Reporting Year", "Affordable Units", "Project Affordability Type"
        if hp and all(c in hp[0] for c in (c_year, c_aff, c_type)):
            years = [int(r[c_year]) for r in hp if (r[c_year] or "").isdigit()]
            # latest FULL year: the max year in the file is the current, partial year
            full = max(years) - 1
            incl = [r for r in hp if r[c_year] == str(full) and r[c_type].lower().startswith("incl")]
            tot = sum(num(r[c_aff]) or 0 for r in hp if r[c_year] == str(full))
            n_incl = int(sum(num(r[c_aff]) or 0 for r in incl))
            print(f"\nFOR SCALE: housing_production columns used: year='{c_year}' units='{c_aff}' type='{c_type}' (types starting 'Incl')")
            print(f"  {full}: {n_incl} inclusionary affordable homes ({len(incl)} projects); all affordable incl. 100%-affordable: {tot:,.0f}; max year in file {max(years)} (partial)")
            if n_incl > 0: forScale = {"affordableHomes": n_incl, "year": full}
        else:
            print("  ! housing_production columns not found; meta.forScale = null")
    counts = {s_: sum(1 for w in women100 if w["status"] == s_) for s_ in ("too_much", "too_little", "qualifies")}
    meta = {"counts": counts, "gapCount": sum(w["gap"] for w in women100), "qualifiers": round(qualifiers),
            "womenShareOfQualifiers": round(wq / qualifiers, 4) if qualifiers else None,
            "rent": {b: round(rent(b)) for b in range(4)}, "floor": {b: floor_inc(b) for b in range(4)},
            "limit": {s_: limit(s_) for s_ in range(1, 9)}, "forScale": forScale}
    json.dump(women100, open("public/data/women100.json", "w"), indent=1)
    # SPEC §5.5 / §9.4: neighborhood = exact `nhood` value in sf-neighborhoods.geojson; jobs are invented labels
    display = {"Linh": ("Excelsior", "Home health aide"), "Rosa": ("Mission", "Retired housekeeper"),
               "Ana": ("Sunset/Parkside", "Dental hygienist"), "Priya": ("Mission Bay", "Lab technician")}
    personas_out = {}
    for k in personas:
        w = next((w for w in women100 if w["persona"] == k), None)
        assert w is not None, f"persona {k} not among the 100"
        personas_out[k] = {**w, "neighborhood": display[k][0], "job": display[k][1]}
    if os.path.exists("public/data/sf-neighborhoods.geojson"):
        names = {f["properties"].get("nhood") for f in json.load(open("public/data/sf-neighborhoods.geojson"))["features"]}
        bldg = ["Lakeshore", "Outer Mission", "South of Market", "Mission Bay", "Financial District/South Beach", "Mission",
                "Hayes Valley", "Bayview Hunters Point", "Treasure Island", "Potrero Hill", "Western Addition", "Excelsior",
                "Sunset/Parkside", "Tenderloin", "Bernal Heights", "Outer Richmond", "Inner Sunset", "Visitacion Valley"]
        missing = [n for n in bldg + [v[0] for v in display.values()] if n not in names]
        print(f"  geojson 'nhood' check: {len(names)} names; missing from SPEC §4.1/§5.5: {missing or 'none'}")
        assert not missing
    json.dump(personas_out, open("public/data/personas.json", "w"), indent=1)
    json.dump(meta, open("public/data/meta.json", "w"), indent=1)
    print(f"\n100 WOMEN: {counts}, gap {meta['gapCount']} -> public/data/women100.json")
    print(f"  qualifiers citywide (all renter households): {qualifiers:,.0f}; women-led share {meta['womenShareOfQualifiers']}")
    for pct_, homes_ in ((5, 117), (8, 148), (10, 141), (20, 48)):   # affordable homes from SPEC §4.3
        print(f"  odds at {pct_}% ({homes_} homes): 1 in {round(qualifiers/homes_):,} · women-led homes ≈ {round(homes_*meta['womenShareOfQualifiers'])}")
    print(f"  forScale: {forScale}")
    assert sum(counts.values()) == 100 and len(women100) == 100
    assert set(personas_out) == {"Linh", "Rosa", "Ana", "Priya"}
    assert personas_out["Linh"]["status"] == "too_little" and personas_out["Linh"]["size"] == 3
    assert personas_out["Priya"]["gap"] and personas_out["Ana"]["status"] == "qualifies" and personas_out["Rosa"]["status"] == "too_little"
    for k, v in personas.items():
        print(f"  {k:6} size {v['size']} kids {v['kids']} age {v['householderAge']} ${v['income']:,} rent ${v['rentMonthly']}/mo share {v['rentBurden']} -> {v['status']}{' (gap)' if v['gap'] else ''} serial {v['serial']} occp {v['occp']}")

# ---------------------------------------------------------------- 3. validation (PUMS vs ACS)
def wshare(pred, base=lambda x: True):
    b = [x for x in households if base(x)]
    tot = sum(x["weight"] for x in b)
    return sum(x["weight"] for x in b if pred(x)) / tot if tot else None
def wmedian(vals):
    vals = sorted(vals); tot = sum(w for _, w in vals); c = 0
    for v, w in vals:
        c += w
        if c >= tot / 2: return v
validation = []
if households:
    tot_acs, _ = acs_find("B11012", "Total")
    fem_acs, flab = acs_find("B11012", "Female householder, no spouse or partner present")
    ren_acs = acs_find("B25003", "Renter")[0]; tot_ten = acs_find("B25003", "Total")[0]
    def add(stat, ours, published, src):
        validation.append({"stat": stat, "pums": ours, "acs": published, "source": src,
                           "diffPts": round((ours - published) * 100, 1) if ours is not None and published is not None else None})
    add("Households (count)", sum(x["weight"] for x in households), tot_acs, "B11012")
    if fem_acs and tot_acs: add("Women-led share (female householder, no spouse/partner)", wshare(lambda x: x["hhType"] == "women_led"), fem_acs / tot_acs, "B11012")
    if ren_acs and tot_ten: add("Renter share", wshare(lambda x: x["renter"]), ren_acs / tot_ten, "B25003")
    # rent burden >=30%: B25070 rows 30.0–34.9 … 50.0+ over total minus 'not computed'
    b = {k: v for k, v in targets.items() if v["table"] == "B25070"}
    if b:
        vals = {v["label"]: v["value"] for v in b.values()}
        over30 = sum(v for l, v in vals.items() if re.search(r"(30\.0|35\.0|40\.0|50\.0)", l) and v)
        tot = next((v for l, v in vals.items() if l.strip(" :") == "Total"), None)
        nc = next((v for l, v in vals.items() if "Not computed" in l), 0) or 0
        if tot: add("Renters paying ≥30% of income on rent", wshare(lambda x: (x["rentBurden"] or 0) >= 0.30, lambda x: x["renter"] and x["rentBurden"] is not None), over30 / (tot - nc), "B25070")
    print("\nVALIDATION (weighted PUMS vs published ACS)")
    for v in validation:
        fmt = (lambda z: f"{z:,.0f}") if v["stat"].startswith("Households") else (lambda z: f"{z*100:.1f}%" if z is not None else "—")
        print(f"  {v['stat'][:55]:55} PUMS {fmt(v['pums']):>10}   ACS {fmt(v['acs']):>10}")
    json.dump(validation, open("data/validation.json", "w"), indent=1)

# ---------------------------------------------------------------- 4. projects from the pipeline
def pick(cols, *alts):
    for a in alts:
        for c in cols:
            if all(p in c.lower() for p in a): return c
    return None
projects = []
if exists("sf_development_pipeline.csv"):
    rd = list(csv.DictReader(open(os.path.join(RAW, "sf_development_pipeline.csv"), encoding="utf-8-sig")))
    cols = list(rd[0].keys()) if rd else []
    c_units = pick(cols, ("net", "unit"), ("prop", "unit"), ("unit",))
    c_bmr   = pick(cols, ("pipeline", "affordable"), ("bmr",), ("afford",))
    c_name  = pick(cols, ("name", "address"), ("address",), ("name",))
    c_dist  = pick(cols, ("supervisor",), ("planning", "district"), ("district",))
    c_stat  = pick(cols, ("status",), ("stage",))
    print(f"\nPIPELINE columns detected: units={c_units} bmr={c_bmr} name={c_name} district={c_dist} status={c_stat}")
    print("  (if any is wrong, edit pick() calls; all columns:", ", ".join(cols[:40]), "...)")
    if c_units:
        big = [r for r in rd if (num(r.get(c_units)) or 0) >= 25]
        big.sort(key=lambda r: -(num(r[c_units]) or 0))
        sample = big[:200]
        random.shuffle(sample)
        for i, r in enumerate(sample[:20]):
            projects.append({
                "id": f"p{i+1}",
                "name": (r.get(c_name) or f"Project {i+1}").strip()[:60],
                "district": r.get(c_dist),
                "status": r.get(c_stat),
                "totalUnits": int(num(r[c_units])),
                "reportedBMR": num(r.get(c_bmr)) if c_bmr else None,
                # ---- ILLUSTRATIVE financials (calibrate per SPEC §7.3) ----
                "costPerSqft": round(random.uniform(850, 1250)),
                "marketRent": {"0": 2900, "1": 3600, "2": 4800, "3": 6000},
                "hurdleYield": round(random.uniform(0.040, 0.055), 4),
                "illustrative": ["costPerSqft", "marketRent", "hurdleYield"],
            })
        json.dump(projects, open("data/projects.json", "w"), indent=1)
        print(f"  {len(big)} pipeline projects >= 25 units; sampled 20 -> data/projects.json")

# ---------------------------------------------------------------- 5. Claude context
lines = [f"# Who's Left Out: fact sheet for Claude (auto-built; ACS {YEAR})",
         "Use ONLY these facts and the simulation payload. Say 'illustrative' for developer numbers.", ""]
if households:
    wl = lambda x: x["hhType"] == "women_led"
    lines += ["## San Francisco households (ACS PUMS, weighted)",
              f"- Households: {sum(x['weight'] for x in households):,.0f}",
              f"- Women-led (female householder, no spouse/partner): {wshare(wl)*100:.0f}%",
              f"- Renters among women-led: {wshare(lambda x: x['renter'], wl)*100:.0f}% vs couple-led: {wshare(lambda x: x['renter'], lambda x: x['hhType']=='couple_led')*100:.0f}%",
              f"- Median income, women-led: ${wmedian([(x['income'], x['weight']) for x in households if wl(x)]):,.0f}; couple-led: ${wmedian([(x['income'], x['weight']) for x in households if x['hhType']=='couple_led']):,.0f}",
              f"- Renters paying ≥30% of income on rent, women-led: {wshare(lambda x: (x['rentBurden'] or 0) >= .3, lambda x: wl(x) and x['renter'] and x['rentBurden'] is not None)*100:.0f}% vs couple-led: {wshare(lambda x: (x['rentBurden'] or 0) >= .3, lambda x: x['hhType']=='couple_led' and x['renter'] and x['rentBurden'] is not None)*100:.0f}%",
              f"- Single mothers (female householder with own kids <18): {wshare(lambda x: x['singleParent'] and x['householderSex']=='F')*100:.1f}% of households",
              f"- Renter households (any type) whose income fits the affordable-home range: {meta['qualifiers']:,}; women-led share of them: {meta['womenShareOfQualifiers']*100:.0f}%",
              ""]
    if meta.get("forScale"):
        lines.insert(-1, f"- For scale (DataSF Housing Production xdht-4php): SF completed {meta['forScale']['affordableHomes']:,} affordable homes through the inclusionary program in {meta['forScale']['year']}.")
lines += [
 "## Published facts (cite these exactly)",
 "- MOHCD 2026 income limits: 100% AMI for a 4-person household = $162,100; 80% AMI = $90,750 (1 person) / $129,700 (4 people). Effective June 1, 2026.",
 "- California (GEPI 2024, ACS-based): 68% of renting women-led households are rent-burdened, 41% more likely than couple-led; single mothers and women 65+ have the highest rent burden.",
 "- California (GEPI): women-led households are 5x as likely as married-couple households to be extremely low-income.",
 "- SF.gov: women in San Francisco experience poverty at a higher rate than men.",
 "- SF Planning: of 23,202 units built since 2005 (as reported ~2017), fewer than 10% had 3+ bedrooms (SF Chronicle).",
 "- SF Inclusionary program applies to projects of 25+ units; the Board of Supervisors approved legislation reducing inclusionary requirements on July 21, 2026 (sfplanning.org).",
 "- Existing feasibility tools (Grounded Solutions calculator, Terner Housing Policy Simulator, SF Controller studies) model whether buildings get built, not who the units reach.",
 "", "## Data provenance",
 "- Households: ACS PUMS (anonymized Census microdata), SF PUMAs, householder records with housing weights.",
 "- Projects: SF Development Pipeline (DataSF 6jgi-cpb4), real project sizes; cost/rent/hurdle fields are ILLUSTRATIVE.",
 "- Affordable context: MOHCD Affordable Housing Pipeline (aaxw-2cb8) and Portfolio (pyxv-n29e), Housing Production (xdht-4php).",
]
open("data/claude_context.md", "w").write("\n".join(lines) + "\n")
print("\nClaude fact sheet -> data/claude_context.md")
