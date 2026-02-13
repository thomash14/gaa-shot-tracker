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
  // Calculate the nearest point on the tooltip rectangle edge to the shot
  const tooltipRight = tooltipLeft + tooltipWidth;
  const tooltipBottom = tooltipTop + tooltipHeight;

  // Clamp shot position to the nearest point on the tooltip border
  const nearestX = Math.max(tooltipLeft, Math.min(shotX, tooltipRight));
  const nearestY = Math.max(tooltipTop, Math.min(shotY, tooltipBottom));

  // If shot is inside the tooltip, no line needed
  if (
    shotX >= tooltipLeft &&
    shotX <= tooltipRight &&
    shotY >= tooltipTop &&
    shotY <= tooltipBottom
  ) {
    return null;
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-40"
      style={{ overflow: 'visible' }}
    >
      <line
        x1={shotX}
        y1={shotY}
        x2={nearestX}
        y2={nearestY}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
    </svg>
  );
}
