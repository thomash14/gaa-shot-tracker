'use client';

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
  tooltipWidth = 180,
  tooltipHeight = 100,
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
    // Shot is inside the tooltip rectangle (happens when tooltip is
    // clamped to container edges on narrow screens). Project to the
    // nearest border so we still draw a visible connector.
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
