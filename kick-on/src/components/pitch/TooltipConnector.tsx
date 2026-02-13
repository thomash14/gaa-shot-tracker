'use client';

// ---------------------------------------------------------------------------
// Shared tooltip positioning — places tooltip AWAY from the shot marker
// ---------------------------------------------------------------------------

const TOOLTIP_W = 200;
const TOOLTIP_H = 150;
const GAP = 20; // minimum px between shot marker and tooltip edge
const PAD = 4;  // minimum px from container edge

/**
 * Position a tooltip so it never overlaps the shot marker.
 *  - Top-half shots → tooltip below
 *  - Bottom-half shots → tooltip above
 *  - Left-side shots → tooltip shifted right
 *  - Right-side shots → tooltip shifted left
 */
export function computeTooltipPosition(
  shotX: number,
  shotY: number,
  containerWidth: number,
  containerHeight: number,
): { left: number; top: number } {
  const shotInTopHalf = shotY < containerHeight / 2;
  const shotOnLeftSide = shotX < containerWidth / 2;

  // Vertical: push tooltip away from shot
  let top: number;
  if (shotInTopHalf) {
    top = shotY + GAP; // below the shot
  } else {
    top = shotY - TOOLTIP_H - GAP; // above the shot
  }

  // Horizontal: push tooltip away from shot
  let left: number;
  if (shotOnLeftSide) {
    left = shotX + GAP; // to the right
  } else {
    left = shotX - TOOLTIP_W - GAP; // to the left
  }

  // Clamp to container bounds
  left = Math.max(PAD, Math.min(left, containerWidth - TOOLTIP_W - PAD));
  top = Math.max(PAD, Math.min(top, containerHeight - TOOLTIP_H - PAD));

  return { left, top };
}

// ---------------------------------------------------------------------------
// Connector line component
// ---------------------------------------------------------------------------

interface TooltipConnectorProps {
  /** Shot position in container-relative pixels */
  shotX: number;
  shotY: number;
  /** Tooltip position (top-left corner) in container-relative pixels */
  tooltipLeft: number;
  tooltipTop: number;
  /** Tooltip dimensions for edge calculation */
  tooltipWidth?: number;
  tooltipHeight?: number;
}

/**
 * SVG overlay that draws a dashed connector line from a shot marker
 * to the nearest edge of its tooltip.
 */
export default function TooltipConnector({
  shotX,
  shotY,
  tooltipLeft,
  tooltipTop,
  tooltipWidth = TOOLTIP_W,
  tooltipHeight = TOOLTIP_H,
}: TooltipConnectorProps) {
  const tooltipRight = tooltipLeft + tooltipWidth;
  const tooltipBottom = tooltipTop + tooltipHeight;

  let endX: number;
  let endY: number;

  const isInside =
    shotX >= tooltipLeft &&
    shotX <= tooltipRight &&
    shotY >= tooltipTop &&
    shotY <= tooltipBottom;

  if (isInside) {
    // Shot is inside the tooltip rectangle (rare edge case on very small
    // containers). Project to the nearest border.
    const dLeft = shotX - tooltipLeft;
    const dRight = tooltipRight - shotX;
    const dTop = shotY - tooltipTop;
    const dBottom = tooltipBottom - shotY;
    const minDist = Math.min(dLeft, dRight, dTop, dBottom);

    endX = shotX;
    endY = shotY;
    if (minDist === dLeft) endX = tooltipLeft;
    else if (minDist === dRight) endX = tooltipRight;
    else if (minDist === dTop) endY = tooltipTop;
    else endY = tooltipBottom;
  } else {
    // Shot is outside — clamp to the nearest point on the tooltip border
    endX = Math.max(tooltipLeft, Math.min(shotX, tooltipRight));
    endY = Math.max(tooltipTop, Math.min(shotY, tooltipBottom));
  }

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
