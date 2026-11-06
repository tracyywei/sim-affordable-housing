'use client';
// The map is the dashboard (SPEC §9). Owner: Agent D.
import './map.css';
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import 'd3-transition';
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import { easeCubicInOut, easeCubicOut } from 'd3-ease';
import type { AppData, CameraHandle, Persona, SfMapProps, SliderResult } from '@/lib/types';
import { BUILDINGS, affordableUnits, windowsTeal } from '@/lib/constants';
import { computeLayout, computeLineup, figureSize } from '@/lib/layout';
import {
  FLY_MS, INTRO_MS, MAX_K, MIN_K, RESET_MS, figureScale, flyTransform, introTransform, translateExtent,
} from '@/lib/camera';
import Neighborhoods from './Neighborhoods';
import Person from './Person';
import Building, { buildingHeight } from './Building';
import Popover from './Popover';
import Whimsy from './Whimsy';
import {
  buildingPopover, chrome, figureScale as householdsPerFigure, groupRow, lineupOddsLine, personaHeader, personaLines, womanTooltip,
} from '@/lib/copy';

const STAGGER_MS = 5;

function personaPopoverLines(p: Persona, result: SliderResult | undefined, meta: AppData['meta']): string[] {
  if (!result) return [];
  const l = personaLines(p, result, meta);
  return [l.household, l.rent, l.statusChip, l.body, l.note].filter((x): x is string => !!x);
}

export default function SfMap(props: SfMapProps) {
  const { data, pct, selected, lineup, reducedMotion, onSelect, cameraRef } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomGRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const tRef = useRef<ZoomTransform>(zoomIdentity);
  const introDone = useRef(false);
  const lineupRef = useRef(lineup);
  const reducedRef = useRef(reducedMotion);
  const onSelectRef = useRef(onSelect);
  const hoverRef = useRef<string | null>(null);
  const selectedRef = useRef(selected);
  useEffect(() => {
    lineupRef.current = lineup;
    reducedRef.current = reducedMotion;
    onSelectRef.current = onSelect;
    selectedRef.current = selected;
  });

  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const [flying, setFlying] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  /* ---------------------------------------------------------------- size */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      if (w > 0 && h > 0) setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------------------------------------------------------------- layout (seeded; recomputed on resize) */
  const layout = useMemo(
    () => (size ? computeLayout(data.geo, data.women, data.personas, BUILDINGS, size.w, size.h, data.meta.pumaNeighborhoods) : null),
    [data.geo, data.women, data.personas, data.meta.pumaNeighborhoods, size],
  );
  const lineupPos = useMemo(() => (size ? computeLineup(data.women, size.w, size.h) : null), [data.women, size]);
  const personaById = useMemo(() => {
    const m = new Map<string, Persona>();
    for (const w of data.women) {
      const p = w.persona ? data.personas[w.persona] : undefined;
      if (p) m.set(w.id, { ...p, ...w, persona: p.persona, neighborhood: p.neighborhood, job: p.job });
    }
    return m;
  }, [data.personas, data.women]);
  const womanById = useMemo(() => new Map(data.women.map((w) => [w.id, w])), [data.women]);

  const result: SliderResult | undefined = data.results[pct] ?? data.results[0];

  /* ---------------------------------------------------------------- camera */
  const apply = useCallback((tr: ZoomTransform) => {
    tRef.current = tr;
    const g = zoomGRef.current;
    if (g) {
      g.setAttribute('transform', tr.toString());
      g.style.setProperty('--fs', String(figureScale(tr.k)));
      g.style.setProperty('--k', String(tr.k));
    }
    svgRef.current?.classList.toggle('zoomed', tr.k > 2);
    wrapRef.current?.setAttribute('data-zoom-k', tr.k.toFixed(2));
    // ~740 figures: only re-render per frame when a popover/tooltip needs the live transform
    if (selectedRef.current || hoverRef.current) setT(tr);
  }, []);

  const transitionTo = useCallback((target: ZoomTransform, ms: number, after?: () => void) => {
    const svg = svgRef.current, z = zoomRef.current;
    if (!svg || !z) { after?.(); return; }
    const sel = select(svg);
    sel.interrupt();
    if (reducedRef.current || ms <= 0) { sel.call(z.transform, target); after?.(); return; }
    let done = false;
    const finish = () => { if (!done) { done = true; after?.(); } };
    sel.transition().duration(ms).ease(easeCubicInOut).call(z.transform, target)
      .on('end', finish).on('interrupt', finish);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !size) return;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_K, MAX_K])
      .extent([[0, 0], [size.w, size.h]])
      .translateExtent(translateExtent(size.w, size.h))
      .filter((ev: MouseEvent & WheelEvent) => !lineupRef.current && (!ev.ctrlKey || ev.type === 'wheel') && !ev.button)
      .on('zoom', (ev: { transform: ZoomTransform }) => apply(ev.transform))
      .on('end', (ev: { transform: ZoomTransform }) => setT(ev.transform));
    zoomRef.current = z;
    const sel = select(svg);
    sel.call(z);
    if (!introDone.current) {
      introDone.current = true;
      if (reducedRef.current) sel.call(z.transform, zoomIdentity);
      else {
        sel.call(z.transform, introTransform(size.w, size.h));
        sel.transition().duration(INTRO_MS).ease(easeCubicOut).call(z.transform, zoomIdentity);
      }
    } else {
      sel.interrupt();
      sel.call(z.transform, zoomIdentity);
    }
    return () => { sel.interrupt(); sel.on('.zoom', null); };
  }, [size, apply]);

  const flyToPoint = useCallback((x: number, y: number) => {
    if (!size || lineupRef.current) return;
    setFlying(!reducedRef.current);
    transitionTo(flyTransform(x, y, size.w, size.h), FLY_MS, () => setFlying(false));
  }, [size, transitionTo]);

  const flyToWoman = useCallback((id: string) => {
    const s = layout?.women[id];
    if (s) flyToPoint(s.x, s.y - 4);
  }, [layout, flyToPoint]);

  const flyToBuilding = useCallback((index: number) => {
    const b = layout?.buildings[index];
    const def = BUILDINGS[index];
    if (b && def) flyToPoint(b.x, b.y - buildingHeight(def.units) / 8);
  }, [layout, flyToPoint]);

  const reset = useCallback(() => {
    setFlying(false);
    transitionTo(zoomIdentity, RESET_MS);
  }, [transitionTo]);

  const zoomBy = useCallback((f: number) => {
    const svg = svgRef.current, z = zoomRef.current;
    if (!svg || !z || lineupRef.current) return;
    const sel = select(svg);
    sel.interrupt();
    if (reducedRef.current) sel.call(z.scaleBy, f);
    else sel.transition().duration(250).call(z.scaleBy, f);
  }, []);

  useImperativeHandle(cameraRef, (): CameraHandle => ({
    zoomIn: () => zoomBy(1.6),
    zoomOut: () => zoomBy(1 / 1.6),
    reset,
    flyToWoman,
    flyToBuilding,
  }), [zoomBy, reset, flyToWoman, flyToBuilding]);

  // Escape resets the camera and closes the popover (SPEC §9.3, §9.7)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || lineupRef.current) return;
      reset();
      if (selectedRef.current) onSelectRef.current(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reset]);

  // Line them up: close the popover, go back to 1x, zoom off (filter reads lineupRef)
  const prevLineup = useRef(lineup);
  useEffect(() => {
    if (prevLineup.current === lineup) return;
    prevLineup.current = lineup;
    if (lineup) {
      if (selectedRef.current) onSelectRef.current(null);
      transitionTo(zoomIdentity, reducedRef.current ? 0 : 400);
    }
  }, [lineup, transitionTo]);

  /* ---------------------------------------------------------------- interactions */
  const activateWoman = useCallback((id: string) => {
    if (lineupRef.current) return;
    setHover(null);
    onSelectRef.current({ kind: 'woman', id });
    flyToWoman(id);
  }, [flyToWoman]);

  const activateBuilding = useCallback((index: number) => {
    if (lineupRef.current) return;
    onSelectRef.current({ kind: 'building', index });
    flyToBuilding(index);
  }, [flyToBuilding]);

  const onHover = useCallback((id: string | null) => {
    hoverRef.current = id;
    setT(tRef.current);
    setHover(id);
  }, []);

  /* ---------------------------------------------------------------- render */
  const anySelected = selected != null && !lineup;

  const buildingCopy = useMemo(() => BUILDINGS.map((b, i) => {
    const built = result?.built[i] ?? false;
    return buildingPopover(b, built, pct, built ? affordableUnits(b.units, pct) : 0);
  }), [result, pct]);

  const figSize = figureSize(data.women.length);
  const stagger = Math.min(STAGGER_MS, 400 / Math.max(1, data.women.length));
  const womenNodes = layout ? data.women.map((w, i) => {
    const spot = layout.women[w.id];
    const pos = lineup && lineupPos ? lineupPos.spots[w.id] ?? spot : spot;
    const persona = personaById.get(w.id);
    return (
      <Person
        key={w.id}
        id={w.id}
        x={pos.x}
        y={pos.y}
        status={w.status}
        persona={persona ? persona.persona : null}
        hair={spot.hair}
        height={spot.height}
        size={figSize}
        delayMs={reducedMotion ? 0 : Math.round(i * stagger)}
        dim={anySelected && !(selected?.kind === 'woman' && selected.id === w.id)}
        selected={!lineup && selected?.kind === 'woman' && selected.id === w.id}
        label={persona ? `${persona.persona}: ${personaHeader(persona)}` : ''}
        onActivate={activateWoman}
        onHover={onHover}
      />
    );
  }) : null;

  // screen anchor for popover/tooltip
  const anchorFor = (x: number, y: number, figH: number) => {
    const k = t.k;
    return { x: t.applyX(x), y: t.applyY(y) - figH * figureScale(k) * k };
  };

  let popover = null;
  if (layout && selected && !lineup && !flying) {
    if (selected.kind === 'woman') {
      const w = womanById.get(selected.id);
      const s = layout.women[selected.id];
      if (w && s) {
        const p = personaById.get(w.id);
        const a = anchorFor(s.x, s.y, p ? 36 : 22);
        popover = p ? (
          <Popover x={a.x} y={a.y} variant="persona" title={personaHeader(p)}
            lines={personaPopoverLines(p, result, data.meta)} closeLabel={chrome.close} onClose={() => onSelect(null)} />
        ) : (
          <Popover x={a.x} y={a.y} variant="woman" title={womanTooltip(w)}
            lines={[]} closeLabel={chrome.close} onClose={() => onSelect(null)} />
        );
      }
    } else {
      const b = BUILDINGS[selected.index];
      const s = layout.buildings[selected.index];
      if (b && s) {
        const a = anchorFor(s.x, s.y, buildingHeight(b.units) + 6);
        const c = buildingCopy[selected.index];
        popover = (
          <Popover x={a.x} y={a.y} variant="building" title={c.title} lines={[c.sub, `${c.head} ${c.status}`, c.body]}
            closeLabel={chrome.close} onClose={() => onSelect(null)} />
        );
      }
    }
  }

  let tooltip = null;
  if (layout && hover && !lineup && !(selected?.kind === 'woman' && selected.id === hover)) {
    const w = womanById.get(hover);
    const s = layout.women[hover];
    if (w && s) {
      const a = anchorFor(s.x, s.y, 22);
      tooltip = (
        <div className="map-tooltip" role="tooltip" style={{ left: a.x, top: a.y }}>{womanTooltip(w)}</div>
      );
    }
  }


  return (
    <div
      ref={wrapRef}
      className={`sf-map${lineup ? ' lineup' : ''}${reducedMotion ? ' reduced' : ''}${anySelected ? ' has-selection' : ''}`}
      data-lineup={lineup ? 'true' : 'false'}
      data-pct={pct}
      data-geo={layout?.placeholder ? 'placeholder' : 'real'}
      data-missing-neighborhoods={layout?.missing.join('|') || undefined}
    >
      <svg ref={svgRef} className="sf-map-svg" width={size?.w ?? '100%'} height={size?.h ?? '100%'}>
        <defs>
          <filter id="wobble" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={7} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={1.5} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <rect className="bay" x={0} y={0} width="100%" height="100%" />
        <g ref={zoomGRef} className="zoom-layer">
          {layout && <Neighborhoods shapes={layout.neighborhoods} />}
          {layout && <Whimsy layout={layout} />}
          {layout && (
            <g className="buildings">
              {BUILDINGS.map((b, i) => {
                const pt = layout.buildings[i];
                if (!pt) return null;
                const isSel = selected?.kind === 'building' && selected.index === i;
                return (
                  <Building
                    key={b.id}
                    index={i}
                    def={b}
                    x={pt.x}
                    y={pt.y}
                    built={result?.built[i] ?? false}
                    teal={windowsTeal(b.units, pct)}
                    dim={anySelected && !isSel}
                    selected={!lineup && isSel}
                    label={`${buildingCopy[i].title}, ${buildingCopy[i].sub}. ${buildingCopy[i].head} ${buildingCopy[i].status}`}
                    notBuiltTag={buildingCopy[i].status}
                    onActivate={activateBuilding}
                  />
                );
              })}
            </g>
          )}
          {lineup && lineupPos && (
            <rect className="lineup-panel" aria-hidden x={lineupPos.panel.x} y={lineupPos.panel.y}
              width={lineupPos.panel.w} height={lineupPos.panel.h} rx={18} />
          )}
          <g className={`figures${reducedMotion ? '' : ' walk'}`}>
            {womenNodes?.filter((n) => !personaById.has(String(n.key)))}
            {/* personas last so their rings and name tags sit on top of the crowd */}
            {womenNodes?.filter((n) => personaById.has(String(n.key)))}
          </g>
        </g>
      </svg>

      {lineup && lineupPos && (
        <div className="lineup-labels" aria-live="polite">
          {lineupPos.blocks.map((b) => (
            <div key={b.status} className={`lineup-block ${b.status}`} data-lineup-block={b.status}
              style={{ left: b.x + b.w / 2, top: b.y, width: Math.max(b.w + 40, 180), ['--block-h' as string]: `${b.h}px` }}>
              <div className="lineup-head">
                {(() => {
                  const g = groupRow(b.status, b.count, data.women.length, householdsPerFigure(data.meta));
                  return (
                    <>
                      <div className="lineup-label">{g.label}</div>
                      <div className="lineup-count num">{g.pct} · {g.households}</div>
                    </>
                  );
                })()}
              </div>
              {b.status === 'qualifies' && (
                <div className="lineup-odds" style={{ top: b.h + 6 }}>{result ? lineupOddsLine(result).replace(/1 in (\S+)/, '1\u00a0in\u00a0$1') : null}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {tooltip}
      {popover}
    </div>
  );
}
