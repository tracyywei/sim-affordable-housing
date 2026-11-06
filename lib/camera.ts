// d3-zoom camera helpers (owner: Agent D). SPEC §9.3, §9.7.
import { zoomIdentity, type ZoomTransform } from 'd3-zoom';
import { FIT_PAD, fitLeft } from './layout';

export const MIN_K = 1;
export const MAX_K = 8;
export const FLY_K = 4;
export const FLY_MS = 750;
export const INTRO_MS = 1500;
export const INTRO_K = 0.85;
export const RESET_MS = 600;

/** Net scale for a figure drawn inside the zoomed group: counter-scale by 1/k, but grow up to 1.6x on screen. */
export function figureScale(k: number): number {
  const screen = Math.min(1.6, 1 + ((k - 1) * 0.6) / (MAX_K - 1));
  return screen / k;
}

/** Visual center of the map area (left of the right rail, between title and control bar). */
export function mapCenter(width: number, height: number): [number, number] {
  return [(fitLeft(width) + width - FIT_PAD.right) / 2, (FIT_PAD.top + height - FIT_PAD.bottom) / 2];
}

/** Transform that puts map point (x, y) at the map center at zoom k. */
export function flyTransform(x: number, y: number, width: number, height: number, k = FLY_K): ZoomTransform {
  const [cx, cy] = mapCenter(width, height);
  return zoomIdentity.translate(cx - k * x, cy - k * y).scale(k);
}

/** Intro start: 0.85x around the map center. */
export function introTransform(width: number, height: number): ZoomTransform {
  const [cx, cy] = mapCenter(width, height);
  return zoomIdentity.translate(cx * (1 - INTRO_K), cy * (1 - INTRO_K)).scale(INTRO_K);
}

/** Pan limits: keep SF in view (map extent padded generously). */
export function translateExtent(width: number, height: number): [[number, number], [number, number]] {
  return [[-width * 0.25, -height * 0.25], [width * 1.25, height * 1.25]];
}
