// Owner: Agent E. The page's <h1>, visually hidden (the human asked for no visible title block).
import { chrome } from '@/lib/copy';
import type { TitleBlockProps } from '@/lib/types';

/** `onOpenInfo` is accepted and ignored so older callers still compile. */
export default function TitleBlock(_props: Partial<TitleBlockProps> = {}) {
  void _props;
  return <h1 className="sr-only">{chrome.subtitle}</h1>;
}
