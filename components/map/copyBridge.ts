// Calls lib/copy.ts (owner: Agent C) defensively: every map string comes from there; '[copy]' until it exists.
import * as copyModule from '@/lib/copy';

const COPY = copyModule as unknown as Record<string, unknown>;
export const PLACEHOLDER = '[copy]';

/** Call copy[name](...args); placeholder if missing or it throws. */
export function copyCall(name: string, ...args: unknown[]): unknown {
  const fn = COPY[name];
  if (typeof fn !== 'function') return PLACEHOLDER;
  try { return (fn as (...a: unknown[]) => unknown)(...args); } catch { return PLACEHOLDER; }
}

/** Flatten whatever the copy function returned (string, string[], object of strings) into lines. */
export function toLines(v: unknown): string[] {
  if (v == null || v === false) return [];
  if (typeof v === 'string' || typeof v === 'number') return [String(v)];
  if (Array.isArray(v)) return v.flatMap(toLines);
  if (typeof v === 'object') return Object.values(v as Record<string, unknown>).flatMap(toLines);
  return [String(v)];
}

export function copyText(name: string, ...args: unknown[]): string {
  return toLines(copyCall(name, ...args)).join(' ') || PLACEHOLDER;
}

/** chrome.<key> (string or function); placeholder if missing. */
export function chromeText(key: string, ...args: unknown[]): string {
  const c = COPY.chrome as Record<string, unknown> | undefined;
  const v = c?.[key];
  if (typeof v === 'function') { try { return toLines((v as (...a: unknown[]) => unknown)(...args)).join(' '); } catch { return PLACEHOLDER; } }
  if (typeof v === 'string') return v;
  return PLACEHOLDER;
}
