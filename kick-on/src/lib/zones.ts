/**
 * 9-zone classification system for GAA pitch analysis.
 * Ported from analytics.js — logic must stay identical.
 *
 * Shot coordinates are percentages (0-100) relative to SVG viewBox 500x725.
 * Pitch boundary: x=25..425, y=40..684.
 *
 * Zones (attacking half, measured from top goal):
 *   1 = Outside 45m        grey     #9E9E9E
 *   2 = Left Wing           blue     #2196F3
 *   3 = Centre 40m-45m      cyan     #03A9F4
 *   4 = Right Wing           blue     #2196F3
 *   5 = 35m-40m Arc         orange   #FF9800
 *   6 = Inside 35m Arc      lime     #CDDC39
 *   7 = Close Left           green    #4CAF50
 *   8 = Close Centre         lt-green #8BC34A
 *   9 = Close Right           green    #4CAF50
 */

// ---------------------------------------------------------------------------
// Pitch boundary constants (SVG viewBox 0 0 500 725)
// ---------------------------------------------------------------------------

export const PITCH = {
  VIEW_W: 500,
  VIEW_H: 725,
  X_MIN: 25,
  X_MAX: 425,
  Y_MIN: 40,
  Y_MAX: 684,
  WIDTH: 400,   // 425 - 25
  HEIGHT: 644,  // 684 - 40
  CENTRE_X: 225,
  HALFWAY: 362, // (40 + 684) / 2
} as const;

// As percentages (0-100) of SVG viewBox 500x725
export const PITCH_PCT = {
  X_MIN: (PITCH.X_MIN / PITCH.VIEW_W) * 100,   // 5
  X_MAX: (PITCH.X_MAX / PITCH.VIEW_W) * 100,   // 85
  Y_MIN: (PITCH.Y_MIN / PITCH.VIEW_H) * 100,   // 5.517…
  Y_MAX: (PITCH.Y_MAX / PITCH.VIEW_H) * 100,   // 94.345…
} as const;

// ---------------------------------------------------------------------------
// Zone classification
// ---------------------------------------------------------------------------

export interface ZoneResult {
  zone: number;
  name: string;
  color: string;
}

export const ZONE_COLORS: Record<number, string> = {
  1: '#9E9E9E',
  2: '#2196F3',
  3: '#03A9F4',
  4: '#2196F3',
  5: '#FF9800',
  6: '#CDDC39',
  7: '#4CAF50',
  8: '#8BC34A',
  9: '#4CAF50',
};

export const ZONE_NAMES: Record<number, string> = {
  1: 'Outside 45m',
  2: 'Left Wing',
  3: 'Centre 40m-45m',
  4: 'Right Wing',
  5: '35m-40m Arc',
  6: 'Inside 35m Arc',
  7: 'Close Left',
  8: 'Close Centre',
  9: 'Close Right',
};

/**
 * Classify a shot into one of 9 zones.
 * Coordinates are percentages (0-100) relative to full SVG viewBox.
 * Shots from the far half are automatically mirrored before classification.
 *
 * Ported verbatim from analytics.js getZone().
 */
export function getZone(xPct: number, yPct: number): ZoneResult {
  if (typeof xPct !== 'number' || typeof yPct !== 'number' || isNaN(xPct) || isNaN(yPct)) {
    return { zone: 0, name: 'Unknown', color: '#9E9E9E' };
  }

  // Mirror far-half shots to attacking half (percentage space)
  let x = xPct;
  let y = yPct;
  if (y >= 50) {
    x = PITCH_PCT.X_MIN + PITCH_PCT.X_MAX - x;
    y = PITCH_PCT.Y_MIN + PITCH_PCT.Y_MAX - y;
  }

  // Convert to SVG coords
  const svgX = (x / 100) * 500;
  const svgY = (y / 100) * 725;

  // Distance from goal centre (225, 40)
  const goalX = 225;
  const goalY = 40;
  const distanceFromGoal = Math.sqrt((svgX - goalX) ** 2 + (svgY - goalY) ** 2);

  // Key SVG y-coordinates
  const line13m = 98;
  const line20m = 129;
  const line45m = 240;

  // Arc radii (from goal centre)
  const arc21m = 58;
  const arc35m = 156;
  const arc40m = 178;

  // Lateral zone edges (13m from each sideline)
  const leftZoneEdge = 115;
  const rightZoneEdge = 335;

  // Wing zone thirds (for zone 2/3/4 split)
  const leftThird = 158;
  const rightThird = 292;

  const z = (zone: number): ZoneResult => ({
    zone,
    name: ZONE_NAMES[zone],
    color: ZONE_COLORS[zone],
  });

  // --- Classification (order matters — matches analytics.js exactly) ---

  if (svgY > line45m) {
    return z(1); // Outside 45m
  }

  if (svgY <= line13m) {
    if (svgX < leftZoneEdge) return z(7);  // Close Left
    if (svgX > rightZoneEdge) return z(9); // Close Right
    return z(8);                            // Close Centre
  }

  if (svgY <= line20m) {
    if (svgX < leftZoneEdge) return z(7);  // Close Left (extends to 20m on sides)
    if (svgX > rightZoneEdge) return z(9); // Close Right (extends to 20m on sides)
    if (distanceFromGoal <= arc21m) return z(8); // Close Centre (21m arc)
    return z(6); // Inside 35m Arc
  }

  if (distanceFromGoal <= arc35m && svgY <= line45m) {
    return z(6); // Inside 35m Arc
  }

  if (distanceFromGoal <= arc40m && distanceFromGoal > arc35m && svgY <= line45m) {
    return z(5); // 35m-40m Arc
  }

  if (svgY <= line45m) {
    if (svgX < leftThird) return z(2);  // Left Wing
    if (svgX > rightThird) return z(4); // Right Wing
    return z(3);                         // Centre 40m-45m
  }

  return z(1); // Fallback: Outside 45m
}

export function getZoneName(zone: number): string {
  return ZONE_NAMES[zone] ?? 'Unknown';
}

/**
 * Check if coordinates fall in the 2-point scoring zone.
 * Ported from pitch.js is2PointZone() — shots OUTSIDE the 40m arc
 * and OUTSIDE the 20m line are worth 2 points.
 */
export function is2PointZone(xPct: number, yPct: number): boolean {
  const svgX = (xPct / 100) * 500;
  const svgY = (yPct / 100) * 725;
  const isTopGoal = svgY < PITCH.HALFWAY;

  if (isTopGoal) {
    if (svgY <= 129) return false; // Inside 20m line
    const dist = Math.sqrt((svgX - 225) ** 2 + (svgY - 40) ** 2);
    return dist > 178; // Outside 40m arc
  } else {
    if (svgY >= 595) return false; // Inside 20m line (bottom)
    const dist = Math.sqrt((svgX - 225) ** 2 + (svgY - 684) ** 2);
    return dist > 178; // Outside 40m arc (bottom)
  }
}

/**
 * Get the point value for a shot.
 * Ported from pitch.js getPointValue().
 */
export function getPointValue(shot: { x: number; y: number; shotCategory?: string }): number {
  if (shot.shotCategory === '45') return 1;
  if (is2PointZone(shot.x, shot.y)) return 2;
  return 1;
}

/**
 * Mirror shot coordinates from far half to attacking half.
 * Returns new coordinates; does NOT mutate the input.
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
