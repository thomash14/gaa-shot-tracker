/**
 * Shot coordinate math — percentage ↔ SVG ↔ pitch-metre conversions,
 * distance calculations, and mirroring logic.
 *
 * Ported from pitch.js. All constants must stay identical to the original.
 *
 * Coordinate systems:
 *   Percentage:  0-100  relative to SVG viewBox 500×725
 *   SVG:         0-500 (x), 0-725 (y)
 *   Pitch:       -45..+45 (x, metres from centre), 0..145 (y, metres from top goal)
 */

import { PITCH, PITCH_PCT } from './zones';

// ---------------------------------------------------------------------------
// Percentage ↔ SVG conversion
// ---------------------------------------------------------------------------

/** Convert percentage coords (0-100) to SVG viewBox coords (0-500 × 0-725). */
export function pctToSvg(xPct: number, yPct: number): { svgX: number; svgY: number } {
  return {
    svgX: (xPct / 100) * PITCH.VIEW_W,
    svgY: (yPct / 100) * PITCH.VIEW_H,
  };
}

/** Convert SVG viewBox coords to percentage coords. */
export function svgToPct(svgX: number, svgY: number): { x: number; y: number } {
  return {
    x: (svgX / PITCH.VIEW_W) * 100,
    y: (svgY / PITCH.VIEW_H) * 100,
  };
}

// ---------------------------------------------------------------------------
// SVG ↔ Pitch-metre conversion
// ---------------------------------------------------------------------------

/**
 * Convert SVG coords to pitch-metre coords.
 * pitchX: -45..+45 (negative = left of centre)
 * pitchY: 0..145 (0 = top goal line, 145 = bottom goal line)
 *
 * Ported from pitch.js createPendingShot().
 */
export function svgToPitchMetres(svgX: number, svgY: number): { pitchX: number; pitchY: number } {
  return {
    pitchX: ((svgX - PITCH.X_MIN) / PITCH.WIDTH) * 90 - 45,
    pitchY: ((svgY - PITCH.Y_MIN) / PITCH.HEIGHT) * 145,
  };
}

// ---------------------------------------------------------------------------
// Distance to goal
// ---------------------------------------------------------------------------

/**
 * Calculate distance (in metres) from a shot position to the nearest goal.
 * Input: percentage coords (0-100).
 *
 * Ported from pitch.js createPendingShot() / handleDrag().
 */
export function distanceToGoal(xPct: number, yPct: number): number {
  const { svgX, svgY } = pctToSvg(xPct, yPct);
  const { pitchX, pitchY } = svgToPitchMetres(svgX, svgY);

  const distToTop = pitchY;
  const distToBottom = 145 - pitchY;
  const isTopGoal = distToTop < distToBottom;
  const straightDist = isTopGoal ? distToTop : distToBottom;

  return Math.sqrt(pitchX * pitchX + straightDist * straightDist);
}

/**
 * Determine which goal the shot is aimed at.
 * Returns 'top' or 'bottom'.
 */
export function nearestGoal(yPct: number): 'top' | 'bottom' {
  const svgY = (yPct / 100) * PITCH.VIEW_H;
  const { pitchY } = svgToPitchMetres(PITCH.CENTRE_X, svgY);
  return pitchY < 145 - pitchY ? 'top' : 'bottom';
}

// ---------------------------------------------------------------------------
// Mirroring
// ---------------------------------------------------------------------------

/**
 * Mirror shot coordinates from far half to attacking (top) half.
 * Uses the same pitch-centre mirroring as renderShotMapWithFilters in analytics.js.
 * Returns new coordinates; never mutates input.
 */
export function mirrorToAttackingHalf(
  xPct: number,
  yPct: number
): { x: number; y: number } {
  if (yPct >= 50) {
    return {
      x: PITCH_PCT.X_MIN + PITCH_PCT.X_MAX - xPct,
      y: PITCH_PCT.Y_MIN + PITCH_PCT.Y_MAX - yPct,
    };
  }
  return { x: xPct, y: yPct };
}

/**
 * Check if a shot needs mirroring (i.e. it's in the far/bottom half).
 */
export function needsMirror(yPct: number): boolean {
  return yPct >= 50;
}

// ---------------------------------------------------------------------------
// Click → shot position (from DOM event)
// ---------------------------------------------------------------------------

/**
 * Convert a click/touch position relative to the pitch element's bounding rect
 * into percentage coordinates (0-100) and distance to nearest goal.
 *
 * Ported from pitch.js createPendingShot().
 */
export function clickToShotPosition(
  clientX: number,
  clientY: number,
  rect: DOMRect
): { x: number; y: number; distance: number } {
  const x = (clientX - rect.left) / rect.width * 100;
  const y = (clientY - rect.top) / rect.height * 100;
  const distance = distanceToGoal(x, y);
  return { x, y, distance };
}

/**
 * Clamp percentage coords to 0-100 range (for drag operations).
 */
export function clampPct(xPct: number, yPct: number): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(100, xPct)),
    y: Math.max(0, Math.min(100, yPct)),
  };
}

// ---------------------------------------------------------------------------
// SVG goal coordinates (for distance lines)
// ---------------------------------------------------------------------------

/** SVG coordinates of the top goal centre. */
export const TOP_GOAL = { x: PITCH.CENTRE_X, y: PITCH.Y_MIN } as const; // (225, 40)

/** SVG coordinates of the bottom goal centre. */
export const BOTTOM_GOAL = { x: PITCH.CENTRE_X, y: PITCH.Y_MAX } as const; // (225, 684)
