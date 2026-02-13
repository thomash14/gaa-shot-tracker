'use client';

import type { CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Shared tooltip positioning — places tooltip AWAY from the shot marker.
//
// Key guarantee: the tooltip NEVER overlaps the shot.
//  - Top-half shots → tooltip below (CSS top)
//  - Bottom-half shots → tooltip above (CSS bottom — grows upward)
//  - Left-side shots → tooltip shifted right
//  - Right-side shots → tooltip shifted left
// ---------------------------------------------------------------------------

const TOOLTIP_W = 200;
const GAP = 24; // minimum px between shot marker and tooltip edge
const PAD = 4;  // minimum px from container edge

export interface TooltipPosition {
  /** CSS style object to spread onto the tooltip div */
  style: CSSProperties;
  /** Y coordinate of the tooltip edge nearest to the shot (container-relative px) */
  nearEdgeY: number;
  /** Left edge of tooltip (container-relative px) */
  left: number;
}

export function computeTooltipPosition(
  shotX: number,
  shotY: number,
  containerWidth: number,
  containerHeight: number,
): TooltipPosition {
  const shotInTopHalf = shotY < containerHeight / 2;
  const shotOnLeftSide = shotX < containerWidth / 2;

  // Horizontal: push tooltip away from shot
  let left: number;
  if (shotOnLeftSide) {
    left = shotX + GAP;
  } else {
    left = shotX - TOOLTIP_W - GAP;
  }
  left = Math.max(PAD, Math.min(left, containerWidth - TOOLTIP_W - PAD));

  if (shotInTopHalf) {
    // Shot in top half → tooltip BELOW the shot using CSS `top`.
    // Tooltip grows downward — can never overlap the shot above it.
    const top = shotY + GAP;
    return {
      style: { left, top },
      nearEdgeY: shotY + GAP,
      left,
    };
  } else {
    // Shot in bottom half → tooltip ABOVE the shot using CSS `bottom`.
    // Tooltip grows upward — can never overlap the shot below it,
    // regardless of actual tooltip height.
    const bottom = containerHeight - shotY + GAP;
    return {
      style: { left, bottom },
      nearEdgeY: shotY - GAP,
      left,
    };
  }
}

// ---------------------------------------------------------------------------
// Connector line component
// ---------------------------------------------------------------------------

interface TooltipConnectorProps {
  /** Shot position in container-relative pixels */
  shotX: number;
  shotY: number;
  /** Y coordinate of the tooltip edge nearest to the shot */
  nearEdgeY: number;
  /** Left edge of the tooltip */
  tooltipLeft: number;
  /** Width of the tooltip for horizontal clamping */
  tooltipWidth?: number;
}

/**
 * SVG overlay that draws a dashed connector line from a shot marker
 * to the nearest edge of its tooltip.
 */
export default function TooltipConnector({
  shotX,
  shotY,
  nearEdgeY,
  tooltipLeft,
  tooltipWidth = TOOLTIP_W,
}: TooltipConnectorProps) {
  const tooltipRight = tooltipLeft + tooltipWidth;

  // Horizontal: clamp to the tooltip's horizontal span
  const endX = Math.max(tooltipLeft, Math.min(shotX, tooltipRight));
  const endY = nearEdgeY;

  // Skip if line would be too short to see (< 3px)
  const dx = shotX - endX;
  const dy = shotY - endY;
  if (dx * dx + dy * dy < 9) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-40"
      style={{ overflow: 'visible' }}
    >
      <line
        x1={shotX}
        y1={shotY}
        x2={endX}
        y2={endY}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
    </svg>
  );
}
