'use client';
// Owner: Agent E. Holds AppState, precomputes on load, composes <SfMap> + the HUD.
// DOM order = tab order (SPEC §9.7): slider → Explain → persona chips → Line them up → zoom → ⓘ → map.
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import '@/components/hud/hud.css';
import { loadRawData } from '@/lib/data';
import { precompute } from '@/lib/sim';
import { START_PCT, MAX_PCT, TOTAL_BUILDINGS } from '@/lib/constants';
import { chrome, explainTemplate, claudeNapPrefix } from '@/lib/copy';
import { ui } from '@/components/hud/text';
import StillCaption from '@/components/hud/StillCaption';
import type {
  AppData, CameraHandle, ExplainRequest, ExplainResponse, ExplainState, PersonaName, Persona, Selection, ValidationRow,
} from '@/lib/types';
import validationJson from '@/data/validation.json';
import TitleBlock from '@/components/hud/TitleBlock';
import ZoomControls from '@/components/hud/ZoomControls';
import ControlBar from '@/components/hud/ControlBar';
import Scoreboards from '@/components/hud/Scoreboards';
import AffordableCard from '@/components/hud/AffordableCard';
import Legend from '@/components/hud/Legend';
import ClaudeBubble from '@/components/hud/ClaudeBubble';
import InfoDrawer from '@/components/hud/InfoDrawer';

const SfMap = dynamic(() => import('@/components/map/SfMap'), { ssr: false });

const validation: ValidationRow[] = Array.isArray(validationJson) ? (validationJson as ValidationRow[]) : [];

const EXPLAIN_TIMEOUT_MS = 9000;
const CLOSED_EXPLAIN: ExplainState = { open: false, loading: false, text: '', source: 'template', forPct: START_PCT };

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

export default function Page() {
  const [data, setData] = useState<AppData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [pct, setPct] = useState(START_PCT);
  const [selected, setSelected] = useState<Selection>(null);
  const [lineup, setLineup] = useState(false);
  const [explain, setExplain] = useState<ExplainState>(CLOSED_EXPLAIN);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const reducedMotion = useReducedMotion();
  const cameraRef = useRef<CameraHandle>(null);
  const explainReq = useRef(0); // bumps on every Explain click / slider move; stale answers are dropped

  useEffect(() => {
    let alive = true;
    loadRawData()
      .then((raw) => { if (alive) setData(precompute(raw)); })
      .catch((err: unknown) => { console.warn('data load failed', err); if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, []);

  const onChange = useCallback((next: number) => {
    const p = Math.max(0, Math.min(MAX_PCT, Math.round(next)));
    setPct(p);
    setHasDragged(true);
    explainReq.current += 1;
    setExplain((e) => (e.open ? CLOSED_EXPLAIN : e));
  }, []);

  const onExplain = useCallback(async () => {
    if (!data) return;
    const req: ExplainRequest = {
      pct,
      result: data.results[pct],
      baseline: data.results[START_PCT],
      counts: data.meta.counts,
      gapCount: data.meta.gapCount,
    };
    const template = explainTemplate(req);
    const id = ++explainReq.current;
    setExplain({ open: true, loading: true, text: template, source: 'template', forPct: pct });
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), EXPLAIN_TIMEOUT_MS);
    try {
      const r = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error(`explain ${r.status}`);
      const body = (await r.json()) as Partial<ExplainResponse>;
      if (typeof body.text !== 'string' || !body.text.trim()) throw new Error('explain: empty');
      if (id !== explainReq.current) return;
      const source = body.source === 'claude' || body.source === 'cache' ? body.source : 'template';
      setExplain({ open: true, loading: false, text: body.text, source, forPct: pct });
    } catch {
      if (id !== explainReq.current) return;
      setExplain({ open: true, loading: false, text: `${claudeNapPrefix} ${template}`, source: 'template', forPct: pct });
    } finally {
      window.clearTimeout(timer);
    }
  }, [data, pct]);

  const closeExplain = useCallback(() => {
    explainReq.current += 1;
    setExplain(CLOSED_EXPLAIN);
  }, []);

  const onPersona = useCallback((name: PersonaName) => {
    if (!data) return;
    const p = data.personas[name];
    if (!p) return;
    setLineup(false);
    setSelected({ kind: 'woman', id: p.id });
    cameraRef.current?.flyToWoman(p.id);
  }, [data]);

  const onReset = useCallback(() => {
    setSelected(null);
    cameraRef.current?.reset();
  }, []);

  // Page-level Escape: close the drawer first, then the bubble, then zoom out (SfMap also handles its own).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (drawerOpen) { setDrawerOpen(false); return; }
      if (explain.open) closeExplain();
      setSelected(null);
      cameraRef.current?.reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, explain.open, closeExplain]);

  if (!data) {
    return (
      <main>
        <p className="hud-loading" role="status">{loadError ? ui('loadError') : ui('loading')}</p>
      </main>
    );
  }

  const result = data.results[pct];
  const baseline = data.results[START_PCT];
  const selectedPersona: Persona =
    (selected?.kind === 'woman' && Object.values(data.personas).find((p) => p.id === selected.id)) || data.personas.Linh;

  return (
    <main className={drawerOpen ? 'drawer-open' : undefined}>
      <ControlBar pct={pct} onChange={onChange} onExplain={onExplain} explainLoading={explain.loading} hasDragged={hasDragged} />
      <ClaudeBubble explain={explain} onClose={closeExplain} />
      <StillCaption pct={pct} womenCount={data.women.length} hasDragged={hasDragged} />
      <Legend
        counts={data.meta.counts}
        gapCount={data.meta.gapCount}
        result={result}
        lineup={lineup}
        onToggleLineup={() => { setSelected(null); setLineup((l) => !l); }}
        personas={data.personas}
        onPersona={onPersona}
      />
      <ZoomControls
        onZoomIn={() => cameraRef.current?.zoomIn()}
        onZoomOut={() => cameraRef.current?.zoomOut()}
        onReset={onReset}
      />
      <aside className="rail" aria-label={ui('railLabel')}>
        <Scoreboards result={result} baseline={baseline} total={TOTAL_BUILDINGS} />
        <AffordableCard meta={data.meta} persona={selectedPersona} />
      </aside>
      {selected && !lineup && <p className="zoom-hint" aria-hidden="true">{chrome.escToZoomOut}</p>}
      <TitleBlock onOpenInfo={() => setDrawerOpen(true)} />
      <InfoDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} meta={data.meta} validation={validation} />
      <div className="grain" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg">
          <filter id="hud-paper-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
          <rect width="100%" height="100%" filter="url(#hud-paper-grain)" />
        </svg>
      </div>
      <div className="map-layer">
        <SfMap
          data={data}
          pct={pct}
          selected={selected}
          lineup={lineup}
          reducedMotion={reducedMotion}
          onSelect={setSelected}
          cameraRef={cameraRef}
        />
      </div>
    </main>
  );
}
