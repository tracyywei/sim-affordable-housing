// Buildings on the map: one window per UNITS_PER_WINDOW apartments, teal windows from that building's
// own affordable apartments. Renders <Building> directly (SfMap only lays out buildings after measuring
// its size in an effect, which server rendering doesn't run).
import { describe, expect, test } from 'vitest';
import { renderToString } from 'react-dom/server';
import Building from '@/components/map/Building';
import { BUILDINGS, windowCount, windowsTeal } from '@/lib/constants';
import { buildingHeight } from '@/lib/layout';

function render(i: number, pct: number, built = true) {
  const b = BUILDINGS[i];
  return renderToString(
    <Building index={i} def={b} x={0} y={0} built={built} teal={windowsTeal(b.units, pct)}
      dim={false} selected={false} label={b.name} notBuiltTag="" onActivate={() => {}} />,
  );
}

const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;

describe('Building windows', () => {
  test.each([0, 1, 3, 10, 25])('every building at %i%%: windows match its size, teal matches its affordable apartments', (pct) => {
    BUILDINGS.forEach((b, i) => {
      const html = render(i, pct);
      expect(count(html, /data-window="/g), b.name).toBe(windowCount(b.units));
      expect(count(html, /data-window="teal"/g), b.name).toBe(windowsTeal(b.units, pct));
    });
  });

  test('every window sits inside its facade', () => {
    BUILDINGS.forEach((b, i) => {
      const h = buildingHeight(b.units);
      const html = render(i, 25);
      const wins = [...html.matchAll(/<rect class="win[^"]*"[^>]*>/g)].map((m) => m[0]);
      expect(wins.length, b.name).toBe(windowCount(b.units));
      for (const w of wins) {
        const num = (k: string) => Number(w.match(new RegExp(`\\s${k}="([-\\d.]+)"`))![1]);
        expect(num('y'), b.name).toBeGreaterThanOrEqual(-h);
        expect(num('y') + num('height'), b.name).toBeLessThanOrEqual(0);
        expect(num('x'), b.name).toBeGreaterThanOrEqual(-11);
        expect(num('x') + num('width'), b.name).toBeLessThanOrEqual(11);
      }
    });
  });

  test('the biggest building shows more teal windows than the smallest', () => {
    const big = BUILDINGS.reduce((a, b) => (b.units > a.units ? b : a));
    const small = BUILDINGS.reduce((a, b) => (b.units < a.units ? b : a));
    expect(windowsTeal(big.units, 10)).toBeGreaterThan(windowsTeal(small.units, 10));
    expect(buildingHeight(big.units)).toBeGreaterThan(buildingHeight(small.units));
  });
});
