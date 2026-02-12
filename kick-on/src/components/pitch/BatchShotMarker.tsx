'use client';

import type { Shot } from '@/types';
import { mirrorToAttackingHalf } from '@/lib/shotMap';

/**
 * Composite marker for a group of batch shots at the same position.
 *
 * Displays a single dot whose colour reflects the scored/missed ratio:
 *   - More scored → green (#4CAF50)
 *   - More missed → red (#f44336)
 *   - Equal       → amber (#FF9800)
 *
 * A small label shows "scored/total" (e.g. "4/5") next to the marker.
 */

interface BatchShotMarkerProps {
  shots: Shot[];
  /** Marker radius (SVG units). Default 8 (slightly larger than single). */
  size?: number;
  /** Mirror far-half shots to attacking half. Default false. */
  mirror?: boolean;
  onClick?: (shots: Shot[], e: React.MouseEvent) => void;
  /** Desktop hover enter. */
  onMouseEnter?: (shots: Shot[], e: React.MouseEvent<SVGElement>) => void;
  /** Desktop hover leave. */
  onMouseLeave?: (e: React.MouseEvent<SVGElement>) => void;
}

export default function BatchShotMarker({
  shots,
  size = 8,
  mirror = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: BatchShotMarkerProps) {
  if (shots.length === 0) return null;

  const first = shots[0];
  let displayX = first.x;
  let displayY = first.y;
  if (mirror && first.y >= 50) {
    const mirrored = mirrorToAttackingHalf(first.x, first.y);
    displayX = mirrored.x;
    displayY = mirrored.y;
  }
  const svgX = (displayX / 100) * 500;
  const svgY = (displayY / 100) * 725;

  const total = shots.length;
  const scored = shots.filter((s) => s.result === 'scored').length;
  const missed = total - scored;

  let fill: string;
  if (scored > missed) {
    fill = '#4CAF50'; // green
  } else if (missed > scored) {
    fill = '#f44336'; // red
  } else {
    fill = '#FF9800'; // amber
  }

  const isGoal = first.shotFor === 'goal';
  const label = `${scored}/${total}`;

  // Label offset: place to the right of the marker, nudge up slightly
  const labelX = svgX + size + 3;
  const labelY = svgY + 1;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(shots, e);
  };

  const handleMouseEnter = (e: React.MouseEvent<SVGElement>) => {
    onMouseEnter?.(shots, e);
  };

  const interactive = !!(onClick || onMouseEnter);

  return (
    <g>
      {isGoal ? (
        <rect
          x={svgX - size}
          y={svgY - size}
          width={size * 2}
          height={size * 2}
          fill={fill}
          stroke="#333"
          strokeWidth={1.5}
          style={{ cursor: interactive ? 'pointer' : 'default' }}
          onClick={interactive ? handleClick : undefined}
          onMouseEnter={onMouseEnter ? handleMouseEnter : undefined}
          onMouseLeave={onMouseLeave || undefined}
        />
      ) : (
        <circle
          cx={svgX}
          cy={svgY}
          r={size}
          fill={fill}
          stroke="#333"
          strokeWidth={1.5}
          style={{ cursor: interactive ? 'pointer' : 'default' }}
          onClick={interactive ? handleClick : undefined}
          onMouseEnter={onMouseEnter ? handleMouseEnter : undefined}
          onMouseLeave={onMouseLeave || undefined}
        />
      )}
      {/* Scored/total label */}
      <text
        x={labelX}
        y={labelY}
        fill="#333"
        fontSize="11"
        fontWeight="bold"
        dominantBaseline="central"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {label}
      </text>
    </g>
  );
}
