'use client';
// Owner: Agent E. Holds the app state, precomputes on load, composes <SfMap> + the HUD.
// DOM order = tab order: (heading, not focusable) → slider → persona chips → group button → zoom → map.
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import '@/components/hud/hud.css';
import { loadRawData } from '@/lib/data';
import { precompute } from '@/lib/sim';
import { START_PCT, MAX_PCT, TOTAL_BUILDINGS } from '@/lib/constants';
import { chrome } from '@/lib/copy';
import type { AppData, CameraHandle, PersonaName, Persona, Selection } from '@/lib/types';
import TitleBlock from '@/components/hud/TitleBlock';
import ZoomControls from '@/components/hud/ZoomControls';
import ControlBar from '@/components/hud/ControlBar';
import Scoreboards from '@/components/hud/Scoreboards';
import AffordableCard from '@/components/hud/AffordableCard';
import Legend from '@/components/hud/Legend';

const SfMap = dynamic(() => import('@/components/map/SfMap'), { ssr: false });

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
  const [hasDragged, setHasDragged] = useState(false);
  const reducedMotion = useReducedMotion();
  const cameraRef = useRef<CameraHandle>(null);

  useEffect(() => {
    let alive = true;
    loadRawData()
      .then((raw) => { if (alive) setData(precompute(raw)); })
      .catch((err: unknown) => { console.warn('data load failed', err); if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, []);

  const onChange = useCallback((next: number) => {
    setPct(Math.max(0, Math.min(MAX_PCT, Math.round(next))));
    setHasDragged(true);
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

  // Page-level Escape: close any popover and zoom out (SfMap also handles its own).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onReset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onReset]);

  if (!data) {
    return (
      <main>
        <p className="hud-loading" role="status">{loadError ? chrome.loadError : chrome.loading}</p>
      </main>
    );
  }

  const result = data.results[pct];
  const baseline = data.results[START_PCT];
  const selectedPersona: Persona =
    (selected?.kind === 'woman' && Object.values(data.personas).find((p) => p.id === selected.id)) || data.personas.Linh;

  return (
    <main>
      <TitleBlock />
      <ControlBar pct={pct} onChange={onChange} hasDragged={hasDragged} />
      <Legend
        counts={data.meta.counts}
        gapCount={data.meta.gapCount}
        result={result}
        lineup={lineup}
        onToggleLineup={() => { setSelected(null); setLineup((l) => !l); }}
        personas={data.personas}
        onPersona={onPersona}
        meta={data.meta}
      />
      <ZoomControls
        onZoomIn={() => cameraRef.current?.zoomIn()}
        onZoomOut={() => cameraRef.current?.zoomOut()}
        onReset={onReset}
      />
      <aside className="rail" aria-label={chrome.railLabel}>
        <Scoreboards result={result} baseline={baseline} total={TOTAL_BUILDINGS} meta={data.meta} />
        <AffordableCard meta={data.meta} persona={selectedPersona} />
      </aside>
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
