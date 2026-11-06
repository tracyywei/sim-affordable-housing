// Owner: Agent E. +, −, ⟲ (top-right).
import { chrome } from '@/lib/copy';
import type { ZoomControlsProps } from '@/lib/types';
import { ui } from './text';

export default function ZoomControls({ onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="zoom" role="group" data-hud="zoom">
      <button type="button" className="pill" onClick={onZoomIn} aria-label={ui('zoomIn')} title={ui('zoomIn')}>+</button>
      <button type="button" className="pill" onClick={onZoomOut} aria-label={ui('zoomOut')} title={ui('zoomOut')}>−</button>
      <button type="button" className="pill" onClick={onReset} aria-label={chrome.backToCity} title={chrome.backToCity}>⟲</button>
    </div>
  );
}
