// Owner: Agent E. After the slider sits still for 600 ms, show the "same women" caption for 3 s (SPEC §9.5).
import { useEffect, useState } from 'react';
import { stillCaption } from '@/lib/copy';

export interface StillCaptionProps { pct: number; womenCount: number; hasDragged: boolean; }

export default function StillCaption({ pct, womenCount, hasDragged }: StillCaptionProps) {
  const [shownFor, setShownFor] = useState<number | null>(null);
  useEffect(() => {
    if (!hasDragged) return;
    const show = window.setTimeout(() => setShownFor(pct), 600);
    const hide = window.setTimeout(() => setShownFor(null), 3600);
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, [pct, hasDragged]);
  if (shownFor !== pct) return null;
  return <p className="still-caption" role="status" data-hud="still-caption">{stillCaption(womenCount)}</p>;
}
