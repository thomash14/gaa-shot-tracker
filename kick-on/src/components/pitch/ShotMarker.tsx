'use client';

import { useMemo } from 'react';
import type { Shot } from '@/types';
import { mirrorToAttackingHalf } from '@/lib/shotMap';

/**
 * Individual shot marker rendered as an SVG element inside SvgPitch.
 *
 * - Circle for points, square (rect) for goals.
 * - White fill = scored, red (#f44336) fill = missed.
 * - Dark stroke (#333) 1.5px.
 * - Automatically mirrors far-half shots to the attacking half.
 *
 * Tooltip handling is delegated to the parent via onMouseEnter/onMouseLeave
 * (desktop hover) and onClick (mobile tap). The parent renders the tooltip
 * as an HTML element outside the SVG.
 *
 * Ported from analytics.js renderShotMapFromShots() marker logic.
 */

interface ShotMarkerProps {
  shot: Shot;
  /** Mirror far-half shots to attacking half. Default true (analytics view). */
  mirror?: boolean;
  /** Marker radius (SVG units). Default 6. */
  size?: number;
  /** Optional click handler. */
  onClick?: (shot: Shot, e: React.MouseEvent) => void;
  /** Desktop hover enter. */
  onMouseEnter?: (shot: Shot, e: React.MouseEvent<SVGElement>) => void;
  /** Desktop hover leave. */
  onMouseLeave?: (e: React.MouseEvent<SVGElement>) => void;
}

export default function ShotMarker({
  shot,
  mirror = true,
  size = 6,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: ShotMarkerProps) {
  const { displayX, displayY } = useMemo(() => {
    if (mirror && shot.y >= 50) {
      const mirrored = mirrorToAttackingHalf(shot.x, shot.y);
      return { displayX: mirrored.x, displayY: mirrored.y };
    }
    return { displayX: shot.x, displayY: shot.y };
  }, [shot.x, shot.y, mirror]);

  // Convert percentage to SVG viewBox coords (0-500 × 0-725)
  const svgX = (displayX / 100) * 500;
  const svgY = (displayY / 100) * 725;

  const isScored = shot.result === 'scored';
  const isGoal = shot.shotFor === 'goal';
  const fill = isScored ? 'white' : '#f44336';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(shot, e);
  };

  const handleMouseEnter = (e: React.MouseEvent<SVGElement>) => {
    onMouseEnter?.(shot, e);
  };

  const interactive = !!(onClick || onMouseEnter);

  const commonProps = {
    fill,
    stroke: '#333',
    strokeWidth: 1.5,
    style: { cursor: interactive ? 'pointer' : 'default' } as React.CSSProperties,
    onClick: interactive ? handleClick : undefined,
    onMouseEnter: onMouseEnter ? handleMouseEnter : undefined,
    onMouseLeave: onMouseLeave || undefined,
  };

  if (isGoal) {
    return (
      <rect
        x={svgX - size}
        y={svgY - size}
        width={size * 2}
        height={size * 2}
        {...commonProps}
      />
    );
  }

  return (
    <circle
      cx={svgX}
      cy={svgY}
      r={size}
      {...commonProps}
    />
  );
}
