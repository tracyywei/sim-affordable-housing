// Pre-caches Claude's Explain answers for the demo (SPEC §8). Owner: Agent C.
// Usage: npx tsx scripts/cache-explain.ts [baseUrl]   (default http://localhost:3000; the dev server must be running
// with ANTHROPIC_API_KEY in .env.local). Calls /api/explain?nocache=1 for 5, 8, 10, 20% and writes
// data/explain-cache.json. Only answers with source 'claude' are stored; the route serves an entry only if its
// payload numbers match the request, so re-run this after the data changes.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { ExplainRequest, ExplainResponse, Meta } from '../lib/types';
import { computeResults } from '../lib/sim';
import { explainPayloadKey } from '../lib/copy';
import { START_PCT } from '../lib/constants';

const PCTS = [5, 8, 10, 20];
const root = process.cwd();
const base = process.argv[2] ?? 'http://localhost:3000';

const realMeta = path.join(root, 'public/data/meta.json');
const metaPath = existsSync(realMeta) ? realMeta : path.join(root, 'public/data/fixture/meta.json');
const meta: Meta = JSON.parse(readFileSync(metaPath, 'utf8'));
const results = computeResults(meta);
const cachePath = path.join(root, 'data/explain-cache.json');

async function main() {
  console.log(`meta: ${path.relative(root, metaPath)} · server: ${base}`);
  const cache: Record<string, { key: string; text: string; model: string; savedAt: string }> = {};
  for (const pct of PCTS) {
    const req: ExplainRequest = {
      pct,
      result: results[pct],
      baseline: results[START_PCT],
      counts: meta.counts,
      gapCount: meta.gapCount,
    };
    const t0 = Date.now();
    const res = await fetch(`${base}/api/explain?nocache=1`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    });
    const body = (await res.json()) as ExplainResponse;
    const ms = Date.now() - t0;
    console.log(`\n${pct}% -> ${res.status} ${body.source} (${ms} ms)\n${body.text}`);
    if (body.source === 'claude') {
      cache[String(pct)] = {
        key: explainPayloadKey(req),
        text: body.text,
        model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-5-5 (route default)',
        savedAt: new Date().toISOString(),
      };
    }
  }
  writeFileSync(cachePath, JSON.stringify(cache, null, 2) + '\n');
  console.log(`\nwrote ${Object.keys(cache).length}/${PCTS.length} entries to data/explain-cache.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
