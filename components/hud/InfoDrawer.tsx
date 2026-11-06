// Owner: Agent E. ⓘ drawer (420 px, left): assumptions, the made-up building table, reality check,
// validation.json, notes, sources. Jargon is allowed only here (it comes from drawerCopy).
import { useEffect, useRef } from 'react';
import { chrome, drawerCopy, fmtInt, fmtPctShare, pctPill } from '@/lib/copy';
import { BUILDINGS, START_PCT, TOTAL_BUILDINGS } from '@/lib/constants';
import type { InfoDrawerProps } from '@/lib/types';
import { drawerList, drawerText } from './text';

const isShare = (v: number | null) => v !== null && Math.abs(v) <= 1;
const fmtVal = (v: number | null) => (v === null ? '—' : isShare(v) ? fmtPctShare(v) : fmtInt(v));

export default function InfoDrawer({ open, onClose, meta, validation }: InfoDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (open) {
      opener.current = document.activeElement;
      closeRef.current?.focus();
    } else if (opener.current instanceof HTMLElement) {
      opener.current.focus();
      opener.current = null;
    }
  }, [open]);

  if (!open) return null;
  const assumptions = drawerCopy.assumptions(meta);
  const forScale = drawerCopy.forScale(meta);
  const vHeaders = drawerList('validationHeaders') ?? ['[copy]', '[copy]', '[copy]', '[copy]'];

  return (
    <aside className="drawer" role="dialog" aria-modal="false" aria-labelledby="drawer-title" data-hud="drawer">
      <button ref={closeRef} type="button" className="pill drawer-close" onClick={onClose} aria-label={chrome.close} title={chrome.close}>✕</button>
      <h2 id="drawer-title">{drawerCopy.title}</h2>
      <p>{drawerCopy.sliderTerm}</p>

      <h3>{assumptions.title}</h3>
      <ul>{assumptions.lines.map((l) => <li key={l}>{l}</li>)}</ul>
      <p>{drawerCopy.startingPointNote(START_PCT)}</p>

      <h3>{drawerCopy.buildingTableTitle(TOTAL_BUILDINGS)}</h3>
      <p>{drawerCopy.buildingNote(TOTAL_BUILDINGS)}</p>
      <table data-hud="building-table">
        <thead>
          <tr>{drawerCopy.buildingTableHeaders.map((h, i) => <th key={h} className={i === 0 || i >= 3 ? 'n' : undefined}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {BUILDINGS.map((b) => (
            <tr key={b.id}>
              <td className="n">{b.id}</td>
              <td>{b.name}</td>
              <td>{b.neighborhood}</td>
              <td className="n">{fmtInt(b.units)}</td>
              <td className="n">{b.breakEven < 0 ? '✕' : pctPill(b.breakEven)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {forScale && (
        <>
          <h3>{drawerText('realityCheckTitle')}</h3>
          <p data-hud="for-scale">{forScale}</p>
        </>
      )}

      <h3>{drawerCopy.validationTitle}</h3>
      {validation.length === 0 ? (
        <p>{drawerText('validationEmpty')}</p>
      ) : (
        <table data-hud="validation-table">
          <thead>
            <tr>{vHeaders.map((h, i) => <th key={i} className={i > 0 ? 'n' : undefined}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {validation.map((v) => (
              <tr key={v.stat}>
                <td>{v.stat} <span style={{ color: '#5A5A5A' }}>({v.source})</span></td>
                <td className="n">{fmtVal(v.pums)}</td>
                <td className="n">{fmtVal(v.acs)}</td>
                <td className="n">{v.diffPts !== null && isShare(v.pums) && isShare(v.acs) ? v.diffPts.toFixed(1) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>{drawerText('notesTitle')}</h3>
      <ul>
        <li>{drawerCopy.placementNote}</li>
        <li>{drawerCopy.womenNote(meta)}</li>
        <li>{drawerCopy.claudeNote}</li>
      </ul>

      <h3>{drawerText('sourcesTitle')}</h3>
      <ul>
        {drawerCopy.sources.map((s) => (
          <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>
        ))}
      </ul>
    </aside>
  );
}
