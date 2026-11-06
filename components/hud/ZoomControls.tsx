// Owner: Agent E. +, −, ⟲ (top-right).
import { chrome } from '@/lib/copy';
import type { ZoomControlsProps } from '@/lib/types';

export default function ZoomControls({ onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="zoom" role="group" data-hud="zoom">
      <button type="button" className="hud-btn" onClick={onZoomIn} aria-label={chrome.zoomIn} title={chrome.zoomIn}>+</button>
      <button type="button" className="hud-btn" onClick={onZoomOut} aria-label={chrome.zoomOut} title={chrome.zoomOut}>−</button>
      <button type="button" className="hud-btn" onClick={onReset} aria-label={chrome.backToCity} title={chrome.backToCity}>⟲</button>
    </div>
  );
}
