// Owner: Agent E. After the slider sits still for 600 ms, show the "same women" caption for 3 s (SPEC §9.5).
import { useEffect, useState } from 'react';
import { stillCaption } from '@/lib/copy';

export interface StillCaptionProps { pct: number; womenCount: number; hasDragged: boolean; }

export default function StillCaption({ pct, womenCount, hasDragged }: StillCaptionProps) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!hasDragged) return;
    setShow(false);
    let hide: number | undefined;
    const t = window.setTimeout(() => {
      setShow(true);
      hide = window.setTimeout(() => setShow(false), 3000);
    }, 600);
    return () => { window.clearTimeout(t); if (hide) window.clearTimeout(hide); };
  }, [pct, hasDragged]);
  if (!show) return null;
  return <p className="still-caption" role="status" data-hud="still-caption">{stillCaption(womenCount)}</p>;
}
