// Owner: Agent E. Reads UI strings from lib/copy.ts; shows "[copy]" for any key copy.ts doesn't have yet.
import { chrome, drawerCopy } from '@/lib/copy';

const PLACEHOLDER = '[copy]';

export function ui(key: string): string {
  const v = (chrome as Record<string, unknown>)[key];
  return typeof v === 'string' ? v : PLACEHOLDER;
}

export function drawerText(key: string): string {
  const v = (drawerCopy as Record<string, unknown>)[key];
  return typeof v === 'string' ? v : PLACEHOLDER;
}

export function drawerList(key: string): readonly string[] | null {
  const v = (drawerCopy as Record<string, unknown>)[key];
  return Array.isArray(v) ? (v as string[]) : null;
}
