// Owner: Agent E. The page question + the always-visible "Simplified model" label (static, not a button).
import { chrome, simplifiedModelPill } from '@/lib/copy';
import type { TitleBlockProps } from '@/lib/types';

/** No info drawer any more; `onOpenInfo` is accepted and ignored so older callers still compile. */
export default function TitleBlock(_props: Partial<TitleBlockProps> = {}) {
  void _props;
  return (
    <header className="title-block">
      <h1>{chrome.subtitle}</h1>
      <p className="model-label" data-hud="model-label">{simplifiedModelPill}</p>
    </header>
  );
}
