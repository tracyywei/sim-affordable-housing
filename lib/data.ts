// Loads the app's data files in the browser. Owner after Phase 0: Agent B.
import type { Meta, NeighborhoodsGeo, PersonasFile, Woman } from './types';

/** true = fake fixture (public/data/fixture). MUST be false for the demo. */
export const USE_FIXTURE = true;

const base = USE_FIXTURE ? '/data/fixture' : '/data';

export interface RawData { women: Woman[]; personas: PersonasFile; meta: Meta; geo: NeighborhoodsGeo | null; }

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json() as Promise<T>;
}

export async function loadRawData(): Promise<RawData> {
  const [women, personas, meta, geo] = await Promise.all([
    getJson<Woman[]>(`${base}/women100.json`),
    getJson<PersonasFile>(`${base}/personas.json`),
    getJson<Meta>(`${base}/meta.json`),
    getJson<NeighborhoodsGeo>('/data/sf-neighborhoods.geojson').catch(() => null),
  ]);
  return { women, personas, meta, geo };
}
