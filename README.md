# Who's Left Out

A map dashboard of San Francisco with one slider: how much affordable housing new buildings must include, and which women those homes actually reach. Built for the Code with Claude: Women in AI Hackathon (Nov 6, 2026).

**Simplified model:** income limits are real (MOHCD 2026); the 20 buildings and their break-even points are made up; the 100 women are real anonymized ACS 2024 Census records (PUMS) with invented names, placed illustratively on the map.

## Run locally
```bash
npm install
cp .env.local.example .env.local   # add your ANTHROPIC_API_KEY (optional; without it, Explain uses a template)
npm run dev                        # http://localhost:3000, view at 1440×900
```
Production: `npm run build && npm start`.

## Data
`bash fetch_data.sh && python3 build_data.py` rebuilds `public/data/*.json` and `data/*` from Census and DataSF (see `DATA_README.md`). After a data change, refresh the cached Claude answers: `npx tsx --env-file=.env.local scripts/cache-explain.ts` (dev server running).

## Tests
`npx vitest run` (simulation contract, copy, imports, typecheck, render).

See `SPEC.md` for the design and `DEMO-CHEATSHEET.md` for the demo script.
