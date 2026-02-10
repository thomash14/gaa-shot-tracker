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
 * - Includes <title> tooltip with shot details.
 * - Automatically mirrors far-half shots to the attacking half.
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
}

export default function ShotMarker({
  shot,
  mirror = true,
  size = 6,
  onClick,
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

  // Build tooltip text matching original format
  const tooltipParts: string[] = [isScored ? 'Scored' : 'Missed'];
  if (shot.shotFor) tooltipParts.push(`[${shot.shotFor}]`);
  if (shot.foot) tooltipParts.push(`(${shot.foot} foot)`);
  if (shot.half) tooltipParts.push(`${shot.half} half`);
  if (shot.distance != null) tooltipParts.push(`${shot.distance.toFixed(1)}m`);
  if (shot.comment) tooltipParts.push(shot.comment);
  const tooltip = tooltipParts.join(' - ');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(shot, e);
  };

  const commonProps = {
    fill,
    stroke: '#333',
    strokeWidth: 1.5,
    style: { cursor: onClick ? 'pointer' : 'default' } as React.CSSProperties,
    onClick: onClick ? handleClick : undefined,
  };

  if (isGoal) {
    return (
      <rect
        x={svgX - size}
        y={svgY - size}
        width={size * 2}
        height={size * 2}
        {...commonProps}
      >
        <title>{tooltip}</title>
      </rect>
    );
  }

  return (
    <circle
      cx={svgX}
      cy={svgY}
      r={size}
      {...commonProps}
    >
      <title>{tooltip}</title>
    </circle>
  );
}
