# Data for Who's Left Out

## Quick start (on your Mac, from the project root, ~1 minute)
```bash
bash fetch_data.sh      # downloads everything into data/raw/
python3 build_data.py   # cleans it into public/data/*.json + data/claude_context.md
```
The script was tested on mock data. The real DataSF column names haven't been checked yet: `build_data.py` prints the columns it detected, so check that line on the first run.

## Buildings and housing (DataSF, public domain / PDDL)
| Dataset | ID | Use in app |
|---|---|---|
| SF Development Pipeline (latest quarterly snapshot) | `6jgi-cpb4` | Reality check only (typical project size). The app's 20 buildings are the made-up ones in SPEC §4.1. |
| MOHCD/OCII Affordable Housing Pipeline (includes inclusionary units) | `aaxw-2cb8` | Context: how many affordable units are coming, and at what income levels. Persona/explain facts. |
| MOHCD Affordable Housing Portfolio | `pyxv-n29e` | Context: existing affordable stock by unit size. Supports the "family-size units are scarce" point. |
| Housing Production 2005–present | `xdht-4php` | Context: actual BMR production by affordability level. |
| Data dictionary (pipeline) | sfplanninggis S3 xlsx | Field meanings |

## Women and households (US Census, ACS 1-year, SF County 06-075)
| Source | What it gives |
|---|---|
| **ACS PUMS**, SF PUMAs, householder records | **Real anonymized households** with weights: household type (HHT2: married / cohabiting / female householder with kids / alone …), income, renter status, gross rent, size, kids, age, limited English, disability. **Use these instead of generated households.** |
| B11012 | Household type, including female householder with no spouse or partner |
| B25003 / B25009 / B25011 | Tenure; tenure by household size; tenure by household type and age |
| B25070 | Rent as a % of income (rent burden) |
| B25118 | Tenure by household income |
| B25031 | Median gross rent by bedrooms (a sanity check on illustrative market rents) |
| B17012 | Poverty by family type, including female householder |
| B19126 | Median family income by family type |

## Policy reference
- MOHCD 2026 income limits (100% AMI, 4 persons = $162,100), already encoded in SPEC §7.1
- SF Controller Triennial Feasibility Report 2023 (to calibrate the illustrative developer model)

## Outputs
| File | For |
|---|---|
| `public/data/households.json` | The simulation (browser) |
| `public/data/women100.json`, `personas.json`, `meta.json` | The 100 women, Linh/Rosa/Ana/Priya, and the counts/odds inputs (SPEC §5) |
| `public/data/projects.json` | Reality check only (not used by the sim) |
| `data/raw/sf_neighborhoods.geojson` | Map; simplify with mapshaper → `public/data/sf-neighborhoods.geojson` |
| `data/targets.json`, `data/validation.json` | The "it matches real SF" check |
| `data/claude_context.md` | Paste into the system prompt for `/api/explain` and `/api/persona` |

## If PUMS doesn't download
Generate 100 women from published shares with a fixed seed, and label them "synthetic, based on Census statistics" (SPEC §7).
