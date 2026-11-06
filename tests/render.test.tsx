// Runtime smoke tests: load every module and server-render the map + HUD with the real data.
// Catches errors that only show up when code runs: a module that throws while loading, a
// component that crashes during render (undefined data, bad lookups, a bad slider value).
// renderToString doesn't run effects, so window/d3-zoom code inside useEffect isn't exercised here.
// NOTE: SfMap computes its layout after measuring its size in an effect, so these SfMap renders only
// cover the empty map shell (no buildings or women). Buildings are rendered directly in building.test.tsx.
import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import SfMap from '@/components/map/SfMap';
import Page from '@/app/page';
import TitleBlock from '@/components/hud/TitleBlock';
import ZoomControls from '@/components/hud/ZoomControls';
import ControlBar from '@/components/hud/ControlBar';
import Scoreboards from '@/components/hud/Scoreboards';
import AffordableCard from '@/components/hud/AffordableCard';
import Legend from '@/components/hud/Legend';
import PersonaChips from '@/components/hud/PersonaChips';
import { precompute } from '@/lib/sim';
import { MAX_PCT, START_PCT, TOTAL_BUILDINGS } from '@/lib/constants';
import { PERSONA_NAMES } from '@/lib/types';
import type { Meta, NeighborhoodsGeo, PersonasFile, Selection, ValidationRow, Woman } from '@/lib/types';

// Next-only modules (next/font) can't load outside Next. The import + typecheck tests still cover them.
const NEXT_ONLY = new Set(['../app/layout.tsx']);

const modules = import.meta.glob(['../app/**/*.{ts,tsx}', '../components/**/*.{ts,tsx}', '../lib/**/*.ts']);

describe('every module loads without throwing', () => {
  for (const [file, load] of Object.entries(modules)) {
    if (NEXT_ONLY.has(file)) continue;
    test(file.replace('../', ''), async () => {
      await expect(load()).resolves.toBeTruthy();
    });
  }
});

const pub = (n: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data', n), 'utf8'));
const data = precompute({
  women: pub('women100.json') as Woman[],
  personas: pub('personas.json') as PersonasFile,
  meta: pub('meta.json') as Meta,
  geo: pub('sf-neighborhoods.geojson') as NeighborhoodsGeo,
});
const noop = () => {};
const pcts = Array.from({ length: MAX_PCT + 1 }, (_, i) => i);

function renderMap(over: Partial<Parameters<typeof SfMap>[0]> = {}) {
  return renderToString(
    <SfMap data={data} pct={START_PCT} selected={null} lineup={false} reducedMotion={false} onSelect={noop} {...over} />,
  );
}

describe('SfMap renders', () => {
  test('one result per slider value', () => {
    expect(data.results).toHaveLength(MAX_PCT + 1);
  });

  test.each(pcts)('at %i%%', (pct) => {
    expect(renderMap({ pct })).toContain('<svg');
    expect(renderMap({ pct, lineup: true })).toContain('<svg');
  });

  test('without the neighborhoods file', () => {
    expect(renderToString(
      <SfMap data={{ ...data, geo: null }} pct={START_PCT} selected={null} lineup={false} reducedMotion onSelect={noop} />,
    )).toContain('<svg');
  });

  test('with each persona selected', () => {
    for (const name of PERSONA_NAMES) {
      const sel: Selection = { kind: 'woman', id: data.personas[name].id };
      expect(renderMap({ selected: sel })).toBeTruthy();
      expect(renderMap({ selected: sel, lineup: true })).toBeTruthy();
    }
  });

  test('with every woman selected', () => {
    for (const w of data.women) expect(renderMap({ selected: { kind: 'woman', id: w.id } })).toBeTruthy();
  });

  test('with every building selected, at 0%, start and max', () => {
    for (const pct of [0, START_PCT, MAX_PCT]) {
      for (let i = 0; i < TOTAL_BUILDINGS; i++) {
        expect(renderMap({ pct, selected: { kind: 'building', index: i } })).toBeTruthy();
      }
    }
  });
});

describe('HUD renders', () => {
  const base = data.results[START_PCT];

  test.each(pcts)('Scoreboards, ControlBar, Legend at %i%%', (pct) => {
    const r = data.results[pct];
    renderToString(<Scoreboards result={r} baseline={base} total={TOTAL_BUILDINGS} meta={data.meta} />);
    renderToString(<ControlBar pct={pct} onChange={noop} hasDragged={pct !== START_PCT} />);
    for (const lineup of [false, true]) {
      renderToString(
        <Legend counts={data.meta.counts} gapCount={data.meta.gapCount} result={r} lineup={lineup}
          onToggleLineup={noop} personas={data.personas} onPersona={noop} meta={data.meta} />,
      );
    }
  });

  test('AffordableCard with and without a persona', () => {
    renderToString(<AffordableCard meta={data.meta} persona={null} />);
    for (const name of PERSONA_NAMES) renderToString(<AffordableCard meta={data.meta} persona={data.personas[name]} />);
  });

  test('small controls', () => {
    renderToString(<TitleBlock onOpenInfo={noop} />);
    renderToString(<ZoomControls onZoomIn={noop} onZoomOut={noop} onReset={noop} />);
    renderToString(<PersonaChips personas={data.personas} onPersona={noop} />);
  });

  test('Page renders its loading shell', () => {
    expect(renderToString(<Page />)).toBeTruthy();
  });
});
