#!/usr/bin/env bash
# Who's Left Out — download all public datasets into ./data/raw
# Run from your project root on your Mac:   bash fetch_data.sh
# Needs: curl, python3. No API keys needed (Census allows ~500 keyless calls/day).
set -u
mkdir -p data/raw
cd data/raw

ok()   { echo "  ✓ $1"; }
fail() { echo "  ✗ $1 (skipping)"; }
get()  { # name url
  if curl -fsSL --retry 2 -m 120 -o "$1" "$2"; then ok "$1 ($(wc -c <"$1" | tr -d ' ') bytes)"; else fail "$1"; rm -f "$1"; fi
}

echo "== 1. SF housing / buildings (DataSF, Socrata CSV exports)"
# SF Development Pipeline — latest quarterly snapshot, every project from filing to construction
get sf_development_pipeline.csv  "https://data.sfgov.org/api/views/6jgi-cpb4/rows.csv?accessType=DOWNLOAD"
# MOHCD/OCII Affordable Housing Pipeline — incl. inclusionary units from private developers
get mohcd_affordable_pipeline.csv "https://data.sfgov.org/api/views/aaxw-2cb8/rows.csv?accessType=DOWNLOAD"
# MOHCD Affordable Housing Portfolio — existing affordable buildings, units by size/AMI
get mohcd_affordable_portfolio.csv "https://data.sfgov.org/api/views/pyxv-n29e/rows.csv?accessType=DOWNLOAD"
# Housing Production 2005–present — completed units incl. BMR units by affordability level
get housing_production_2005_present.csv "https://data.sfgov.org/api/views/xdht-4php/rows.csv?accessType=DOWNLOAD"

echo "== 2. SF demographics (Census ACS API, San Francisco County = state 06, county 075)"
Y=2024; DS="acs/acs1"
probe=$(curl -fsS -m 30 "https://api.census.gov/data/$Y/$DS?get=NAME&for=county:075&in=state:06" || true)
if [ -z "$probe" ]; then Y=2023; echo "  (2024 ACS not reachable, falling back to $Y)"; fi
echo "  using ACS 1-year $Y"
echo "$Y" > acs_year.txt
# Detailed tables (whole group + labels so build_data.py can read them)
for T in B11012 B25003 B25070 B25118 B25031 B17012 B19126 B25009 B25011; do
  get "acs_${T}.json"        "https://api.census.gov/data/$Y/$DS?get=NAME,group($T)&for=county:075&in=state:06"
  get "acs_${T}_labels.json" "https://api.census.gov/data/$Y/$DS/groups/$T.json"
done
#  B11012 household type (married / cohabiting / female householder no partner, w/ & w/o kids, alone)
#  B25003 tenure · B25070 rent as % of income · B25118 tenure by household income
#  B25031 median gross rent by bedrooms · B17012 poverty by family type (female householder)
#  B19126 median family income by family type · B25009 tenure by household size
#  B25011 tenure by household type & age of householder

echo "== 3. SF microdata (ACS PUMS, anonymized household records — real, not synthetic)"
# find SF PUMA codes by name
curl -fsS -m 60 "https://api.census.gov/data/$Y/$DS?get=NAME&for=public%20use%20microdata%20area:*&in=state:06" -o pumas_ca.json \
  && python3 - <<'PY' > sf_pumas.txt
import json; rows=json.load(open("pumas_ca.json"))[1:]
print(",".join(r[-1] for r in rows if "San Francisco" in r[0]))
PY
PUMAS=$(cat sf_pumas.txt 2>/dev/null)
if [ -n "$PUMAS" ]; then
  echo "  SF PUMAs: $PUMAS"
  VARS="SERIALNO,WGTP,NP,HHT2,HINCP,ADJINC,TEN,GRNTP,RNTP,BDSP,NOC,HUPAC,AGEP,SEX,LNGI,DIS,OCCP,PUMA"
  # householder rows only (RELSHIPP=20 = reference person), housing units only (TYPEHUGQ=1)
  get pums_sf_householders.json "https://api.census.gov/data/$Y/$DS/pums?get=$VARS&RELSHIPP=20&TYPEHUGQ=1&for=public%20use%20microdata%20area:$PUMAS&in=state:06"
else
  fail "PUMA lookup (PUMS skipped — app falls back to generated households)"
fi

echo "== 3b. Map: SF Analysis Neighborhoods (GeoJSON)"
get sf_neighborhoods.geojson "https://data.sfgov.org/api/geospatial/p5b7-5n3h?method=export&format=GeoJSON"
[ -s sf_neighborhoods.geojson ] || get sf_neighborhoods.geojson "https://data.sfgov.org/resource/j2bu-swwd.geojson?\$limit=100"
echo "   then simplify:  npx mapshaper data/raw/sf_neighborhoods.geojson -simplify 15% -o public/data/sf-neighborhoods.geojson"

echo "== 4. Policy reference PDFs (for humans + Claude context)"
get mohcd_2026_ami_income_limits.pdf "https://media.api.sf.gov/documents/2026_AMI-IncomeLimits-HMFA.pdf"
get controller_feasibility_2023.pdf  "https://sf.gov/sites/default/files/2023-06/Triennial%20Economic%20Feasibilty%20Report%202023.pdf"

cd ../..
echo
echo "Done. Next:  python3 build_data.py"
