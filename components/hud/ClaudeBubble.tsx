// Owner: Agent E. Speech bubble above the control bar: template instantly, then a fade to Claude's text.
import { chrome, claudeLabel } from '@/lib/copy';
import type { ClaudeBubbleProps } from '@/lib/types';

export default function ClaudeBubble({ explain, onClose }: ClaudeBubbleProps) {
  if (!explain.open) return null;
  const fromClaude = explain.source === 'claude' || explain.source === 'cache';
  return (
    <section className="card bubble" aria-live="polite" data-hud="bubble" data-source={explain.source} data-loading={explain.loading}>
      <p className="bubble-label">
        {explain.loading ? (
          <><span className="sparkle" aria-hidden="true">✨</span> {chrome.thinking}</>
        ) : fromClaude ? claudeLabel : null}
      </p>
      <p key={explain.text} className="bubble-text" data-hud="bubble-text">{explain.text}</p>
      <button type="button" className="pill bubble-close" onClick={onClose} aria-label={chrome.close} title={chrome.close}>✕</button>
    </section>
  );
}
