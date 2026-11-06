// Owner: Agent E. Title, subtitle and the always-visible "Simplified model" pill (opens the ⓘ drawer).
import { simplifiedModelPill, chrome } from '@/lib/copy';
import type { TitleBlockProps } from '@/lib/types';
import { ui } from './text';

export default function TitleBlock({ onOpenInfo }: TitleBlockProps) {
  return (
    <header className="title-block">
      <h1>{ui('title')}</h1>
      <p>{ui('subtitle')}</p>
      <button type="button" className="pill hud-btn model-pill" onClick={onOpenInfo} aria-haspopup="dialog" title={chrome.info} data-hud="info">
        <span aria-hidden="true">ⓘ </span>{simplifiedModelPill}
      </button>
    </header>
  );
}
