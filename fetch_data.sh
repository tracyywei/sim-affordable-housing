#!/usr/bin/env bash
# Who's Left Out — download all public datasets into ./data/raw
# Run from your project root on your Mac:   bash fetch_data.sh
# Needs: curl, python3. No API keys needed (Census data comes from keyless www2.census.gov bulk files).
set -u
mkdir -p data/raw
cd data/raw

ok()   { echo "  ✓ $1"; }
fail() { echo "  ✗ $1 (skipping)"; }
get()  { # name url
  if curl -fsSL --retry 2 -m 120 -o "$1" "$2"; then ok "$1 ($(wc -c <"$1" | tr -d ' ') bytes)"; else fail "$1"; rm -f "$1"; fi
}

# usage: bash fetch_data.sh [all|census|other]   (census = ACS + PUMS only)
ONLY="${1:-all}"
if [ "$ONLY" != "census" ]; then
echo "== 1. SF housing / buildings (DataSF, Socrata CSV exports)"
# SF Development Pipeline — latest quarterly snapshot, every project from filing to construction
get sf_development_pipeline.csv  "https://data.sfgov.org/api/views/6jgi-cpb4/rows.csv?accessType=DOWNLOAD"
# MOHCD/OCII Affordable Housing Pipeline — incl. inclusionary units from private developers
get mohcd_affordable_pipeline.csv "https://data.sfgov.org/api/views/aaxw-2cb8/rows.csv?accessType=DOWNLOAD"
# MOHCD Affordable Housing Portfolio — existing affordable buildings, units by size/AMI
get mohcd_affordable_portfolio.csv "https://data.sfgov.org/api/views/pyxv-n29e/rows.csv?accessType=DOWNLOAD"
# Housing Production 2005–present — completed units incl. BMR units by affordability level
get housing_production_2005_present.csv "https://data.sfgov.org/api/views/xdht-4php/rows.csv?accessType=DOWNLOAD"
fi

if [ "$ONLY" != "other" ]; then
echo "== 2. SF demographics (Census ACS, San Francisco County = state 06, county 075)"
# NOTE: api.census.gov now redirects keyless requests to missing_key.html (HTTP 302), so we use
# the keyless bulk files on www2.census.gov instead: ACS table-based summary files + PUMS CSVs.
Y=2024
if ! curl -fsSI -m 30 "https://www2.census.gov/programs-surveys/acs/summary_file/$Y/table-based-SF/data/1YRData/acsdt1y$Y-b11012.dat" >/dev/null; then Y=2023; echo "  ($((Y+1)) ACS summary file not found, falling back to $Y)"; fi
echo "  using ACS 1-year $Y"
echo "$Y" > acs_year.txt
mkdir -p acs$Y pums$Y
SF="https://www2.census.gov/programs-surveys/acs/summary_file/$Y/table-based-SF"
get acs$Y/shells.txt "$SF/documentation/ACS${Y}1YR_Table_Shells.txt"
for T in B11012 B25003 B25070 B25118 B25031 B17012 B19126 B25009 B25011; do
  t=$(echo "$T" | tr 'A-Z' 'a-z')
  get "acs$Y/$t.dat" "$SF/data/1YRData/acsdt1y$Y-$t.dat"
done
#  B11012 household type (married / cohabiting / female householder no partner, w/ & w/o kids, alone)
#  B25003 tenure · B25070 rent as % of income · B25118 tenure by household income
#  B25031 median gross rent by bedrooms · B17012 poverty by family type (female householder)
#  B19126 median family income by family type · B25009 tenure by household size
#  B25011 tenure by household type & age of householder
# convert SF County row + labels into the same JSON shape the Census API returns
python3 -I - "$Y" <<'PY'
import json, sys
Y = sys.argv[1]; shells = {}
for line in open(f"acs{Y}/shells.txt", encoding="utf-8", errors="replace"):
    p = line.rstrip("\n").split("|")
    if len(p) >= 5 and p[3][:1] == "B": shells.setdefault(p[0], []).append((p[3], int(float(p[2] or 0)), p[4]))
for T in "B11012 B25003 B25070 B25118 B25031 B17012 B19126 B25009 B25011".split():
    try:
        rows = [l.rstrip("\n").split("|") for l in open(f"acs{Y}/{T.lower()}.dat", encoding="utf-8")]
    except OSError: print(f"  ✗ {T} missing"); continue
    hdr = rows[0]; sf = next(r for r in rows if r[0] == "0500000US06075")
    stack, labels = [], {}
    for uid, ind, lab in shells.get(T, []):
        stack = stack[:ind] + [lab]; labels[uid + "E"] = {"label": "Estimate!!" + "!!".join(stack)}
    out_h, out_r = ["NAME"], ["San Francisco County, California"]
    for k, v in zip(hdr, sf):
        if "_E" in k:
            a, n = k.split("_E"); out_h.append(f"{a}_{n}E"); out_r.append(v)
    json.dump([out_h, out_r], open(f"acs_{T}.json", "w"))
    json.dump({"variables": labels}, open(f"acs_{T}_labels.json", "w"))
    print(f"  ✓ acs_{T}.json ({len(out_h)-1} estimates, SF County)")
PY

echo "== 3. SF microdata (ACS PUMS, anonymized household records — real, not synthetic)"
# SF County PUMAs (2020 PUMA vintage) from the Census tract-to-PUMA relationship file
get tract_to_puma_2020.txt "https://www2.census.gov/geo/docs/maps-data/data/rel2020/2020_Census_Tract_to_2020_PUMA.txt"
PUMAS=$(awk -F, '$1=="06" && $2=="075"{print $4}' tract_to_puma_2020.txt 2>/dev/null | sort -u | paste -sd, -)
echo "$PUMAS" > sf_pumas.txt
if [ -n "$PUMAS" ]; then
  echo "  SF PUMAs: $PUMAS"
  get pums$Y/csv_hca.zip "https://www2.census.gov/programs-surveys/acs/data/pums/$Y/1-Year/csv_hca.zip"
  get pums$Y/csv_pca.zip "https://www2.census.gov/programs-surveys/acs/data/pums/$Y/1-Year/csv_pca.zip"
  # data dictionary: OCCP occupation titles (persona jobs) and ESR employment status
  get pums$Y/PUMS_Data_Dictionary_$Y.csv "https://www2.census.gov/programs-surveys/acs/tech_docs/pums/data_dict/PUMS_Data_Dictionary_$Y.csv"
  # householder rows only (RELSHIPP=20 = reference person), housing units only (TYPEHUGQ=1)
  python3 -I - "$Y" "$PUMAS" <<'PY'
import csv, io, json, sys, zipfile
Y, pumas = sys.argv[1], set(sys.argv[2].split(","))
HV = "SERIALNO,WGTP,NP,HHT2,HINCP,ADJINC,TEN,GRNTP,RNTP,BDSP,NOC,HUPAC,LNGI,PUMA".split(",")
PV = "AGEP,SEX,DIS,OCCP,ESR".split(",")
def rows(zp, name):
    z = zipfile.ZipFile(zp); n = next(f for f in z.namelist() if f.endswith(".csv"))
    return csv.DictReader(io.TextIOWrapper(z.open(n), encoding="utf-8"))
H = {r["SERIALNO"]: r for r in rows(f"pums{Y}/csv_hca.zip", "h") if r["PUMA"] in pumas and r["TYPEHUGQ"] == "1"}
out = [HV + PV]
for p in rows(f"pums{Y}/csv_pca.zip", "p"):
    if p["PUMA"] in pumas and p["RELSHIPP"] == "20" and p["SERIALNO"] in H:
        h = H[p["SERIALNO"]]; out.append([h[c] for c in HV] + [p[c] for c in PV])
json.dump(out, open("pums_sf_householders.json", "w"))
print(f"  ✓ pums_sf_householders.json ({len(out)-1} SF householder records, {len(H)} SF housing units)")
PY
else
  fail "PUMA lookup (PUMS skipped — app falls back to generated households)"
fi
fi

if [ "$ONLY" != "census" ]; then
echo "== 3b. Map: SF Analysis Neighborhoods (GeoJSON)"
# (p5b7-5n3h's export returns an empty FeatureCollection; j2bu-swwd has the 41 polygons, name property "nhood")
get sf_neighborhoods.geojson "https://data.sfgov.org/api/geospatial/j2bu-swwd?method=export&format=GeoJSON"
echo "   then simplify:  npx mapshaper data/raw/sf_neighborhoods.geojson -simplify 15% keep-shapes -o precision=0.00001 public/data/sf-neighborhoods.geojson"

echo "== 4. Policy reference PDFs (for humans + Claude context)"
get mohcd_2026_ami_income_limits.pdf "https://media.api.sf.gov/documents/2026_AMI-IncomeLimits-HMFA.pdf"
get controller_feasibility_2023.pdf  "https://sf.gov/sites/default/files/2023-06/Triennial%20Economic%20Feasibilty%20Report%202023.pdf"

fi

cd ../..
echo
echo "Done. Next:  python3 build_data.py"
