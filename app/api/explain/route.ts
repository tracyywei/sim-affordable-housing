// POST /api/explain (SPEC §8). Owner: Agent C.
// Order: cache (5/8/10/20%, only if the stored payload numbers match) -> Claude (8 s timeout) -> template.
// Claude's text falls back to the template if it contains a number not in the payload, or banned jargon.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import type { ExplainRequest, ExplainResponse, SliderResult } from '@/lib/types';
import {
  explainFacts,
  explainInstruction,
  explainPayloadKey,
  explainTemplate,
  hasBannedWord,
  unknownNumbers,
} from '@/lib/copy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 8000;
const CACHED_PCTS = [5, 8, 10, 20];
// Models that accept server-side refusal fallbacks ("default" form).
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5', 'claude-fable-5-1']);

interface CacheEntry { key: string; text: string; model?: string; savedAt?: string; }

function isResult(x: unknown): x is SliderResult {
  const r = x as SliderResult;
  return !!r && typeof r.pct === 'number' && typeof r.buildingsBuilt === 'number' && typeof r.newHomes === 'number'
    && typeof r.affordableHomes === 'number' && Array.isArray(r.built) && typeof r.womenHomes === 'number'
    && (r.oddsN === null || typeof r.oddsN === 'number');
}

function isRequest(x: unknown): x is ExplainRequest {
  const q = x as ExplainRequest;
  return !!q && typeof q.pct === 'number' && isResult(q.result) && isResult(q.baseline) && !!q.counts
    && typeof q.counts.too_much === 'number' && typeof q.counts.too_little === 'number'
    && typeof q.counts.qualifies === 'number' && typeof q.gapCount === 'number';
}

async function readCache(): Promise<Record<string, CacheEntry>> {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), 'data', 'explain-cache.json'), 'utf8'));
  } catch {
    return {};
  }
}

async function readContext(): Promise<string> {
  try {
    return await readFile(path.join(process.cwd(), 'data', 'claude_context.md'), 'utf8');
  } catch {
    return '';
  }
}

function reply(body: ExplainResponse, status = 200): Response {
  return Response.json(body, { status });
}

async function askClaude(req: ExplainRequest): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const model = process.env.CLAUDE_MODEL ?? 'claude-sonnet-5-5';
  const context = await readContext();
  const system = [context.trim(), explainInstruction(req.result.built.length)].filter(Boolean).join('\n\n---\n\n');
  const user = `Facts:\n- ${explainFacts(req).join('\n- ')}\n\nPayload:\n${JSON.stringify(req)}\n\nExplain what happens at ${req.pct}%.`;

  const client = new Anthropic({ maxRetries: 0 });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const params = {
      model,
      max_tokens: 300,
      system,
      output_config: { effort: 'low' as const },
      messages: [{ role: 'user' as const, content: user }],
    };
    const msg = FALLBACK_MODELS.has(model)
      ? await client.beta.messages.create(
          { ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' },
          { signal: controller.signal, timeout: TIMEOUT_MS },
        )
      : await client.messages.create(params, { signal: controller.signal, timeout: TIMEOUT_MS });
    if (msg.stop_reason === 'refusal') return null;
    const text = msg.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim();
    return text || null;
  } catch (err) {
    console.warn('[explain] Claude call failed:', err instanceof Error ? err.name + ': ' + err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request): Promise<Response> {
  let req: unknown;
  try {
    req = await request.json();
  } catch {
    return Response.json({ error: 'bad json' }, { status: 400 });
  }
  if (!isRequest(req)) return Response.json({ error: 'bad payload' }, { status: 400 });

  const template = explainTemplate(req);
  const noCache = new URL(request.url).searchParams.get('nocache') === '1';

  if (!noCache && CACHED_PCTS.includes(req.pct)) {
    const entry = (await readCache())[String(req.pct)];
    if (entry && entry.key === explainPayloadKey(req) && entry.text) {
      return reply({ text: entry.text, source: 'cache' });
    }
  }

  const text = await askClaude(req);
  if (text) {
    const bad = unknownNumbers(text, req);
    const banned = hasBannedWord(text);
    if (bad.length === 0 && !banned) return reply({ text, source: 'claude' });
    console.warn('[explain] guard tripped:', { unknownNumbers: bad, banned, text });
  }
  return reply({ text: template, source: 'template' });
}
