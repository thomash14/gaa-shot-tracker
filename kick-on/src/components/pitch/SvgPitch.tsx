'use client';

import { useCallback, useRef, type MouseEvent, type TouchEvent, type ReactNode } from 'react';

/**
 * Reusable GAA pitch SVG component.
 * Replaces the 4 duplicated SVG pitches in the original index.html.
 *
 * ViewBox: 0 0 500 725
 * Pitch boundary: x=25..425, y=40..684  (400×644 px = 90m×145m)
 *
 * Every line, arc, and goal post is identical to the original markup.
 */

interface SvgPitchProps {
  /** Show distance labels (13m, 20m, 45m, 65m) outside the sideline. Default true. */
  showLabels?: boolean;
  /** Crop to attacking (top) half only. Changes viewBox to 0 0 500 362. */
  attackingHalfOnly?: boolean;
  /** Called with percentage coords (0-100) when the pitch is clicked/tapped. */
  onPitchClick?: (xPct: number, yPct: number, event: React.MouseEvent | React.TouchEvent) => void;
  /** Extra className on the wrapper div. */
  className?: string;
  /** Children rendered INSIDE the SVG (e.g. ZoneOverlay, ShotMarker). */
  children?: ReactNode;
}

export default function SvgPitch({
  showLabels = true,
  attackingHalfOnly = false,
  onPitchClick,
  className = '',
  children,
}: SvgPitchProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const touchMovedRef = useRef(false);
  const touchStartTimeRef = useRef(0);
  const recentTouchRef = useRef(false);

  const viewBox = attackingHalfOnly ? '0 0 500 362' : '0 0 500 725';

  // Convert a client-space click to percentage coords relative to the SVG viewBox
  const toPercentage = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      return { x, y };
    },
    []
  );

  const handleClick = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      if (!onPitchClick) return;
      // Suppress synthesised click after a touch tap (prevents double-fire)
      if (recentTouchRef.current) return;
      const pos = toPercentage(e.clientX, e.clientY);
      if (pos) onPitchClick(pos.x, pos.y, e);
    },
    [onPitchClick, toPercentage]
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent<SVGSVGElement>) => {
      const touch = e.touches[0];
      if (!touch) return;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, id: touch.identifier };
      touchMovedRef.current = false;
      touchStartTimeRef.current = Date.now();
    },
    [],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent<SVGSVGElement>) => {
      if (touchMovedRef.current) return;          // already flagged
      const start = touchStartRef.current;
      if (!start) return;
      const touch = Array.from(e.touches).find(t => t.identifier === start.id);
      if (!touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (dx * dx + dy * dy > 100) {              // > 10px movement
        touchMovedRef.current = true;
      }
    },
    [],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent<SVGSVGElement>) => {
      if (!touchStartRef.current) return;
      const elapsed = Date.now() - touchStartTimeRef.current;
      if (!touchMovedRef.current && elapsed < 300 && onPitchClick) {
        // Genuine tap — convert recorded start position to percentage coords
        const pos = toPercentage(touchStartRef.current.x, touchStartRef.current.y);
        if (pos) onPitchClick(pos.x, pos.y, e);
        // Suppress the browser's synthesised click (prevents double-fire with handleClick)
        e.preventDefault();
        recentTouchRef.current = true;
        setTimeout(() => { recentTouchRef.current = false; }, 400);
      }
      touchStartRef.current = null;
    },
    [onPitchClick, toPercentage],
  );

  const handleTouchCancel = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        data-pitch-svg
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto block"
        style={{ touchAction: 'pan-y' }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        {/* Background */}
        <rect width="500" height="725" fill="#5a9d6f" />

        {/* Pitch boundary */}
        <rect x="25" y="40" width="400" height="644" fill="none" stroke="white" strokeWidth="1.5" />

        {/* ---- TOP (attacking) HALF ---- */}

        {/* Halfway line (dashed) */}
        <line x1="25" y1="362" x2="425" y2="362" stroke="white" strokeWidth="2.5" strokeDasharray="10,5" />

        {/* 13m line */}
        <line x1="25" y1="98" x2="425" y2="98" stroke="white" strokeWidth="1" />
        {showLabels && (
          <text x="435" y="103" fill="white" fontSize="16" fontWeight="bold">13m</text>
        )}

        {/* Small rectangle (goal area) */}
        <rect x="175" y="40" width="100" height="58" fill="none" stroke="white" strokeWidth="1" />

        {/* 20m line */}
        <line x1="25" y1="129" x2="425" y2="129" stroke="white" strokeWidth="1" />
        {showLabels && (
          <text x="435" y="134" fill="white" fontSize="16" fontWeight="bold">20m</text>
        )}

        {/* 40m arc (radius 178, centred on goal at 225,40) */}
        <path d="M 71 129 A 178 178 0 0 0 379 129" fill="none" stroke="white" strokeWidth="1" />

        {/* 21m arc (radius 58, centred on goal) */}
        <path d="M 167 129 A 58 58 0 0 0 283 129" fill="none" stroke="white" strokeWidth="1" />

        {/* Penalty spot */}
        <circle cx="225" cy="89" r="3" fill="white" />

        {/* 45m line */}
        <line x1="25" y1="240" x2="425" y2="240" stroke="white" strokeWidth="1" />
        {showLabels && (
          <text x="435" y="245" fill="white" fontSize="16" fontWeight="bold">45m</text>
        )}

        {/* 65m line (top half side) */}
        <line x1="25" y1="329" x2="425" y2="329" stroke="white" strokeWidth="1" />
        {showLabels && (
          <text x="435" y="334" fill="white" fontSize="16" fontWeight="bold">65m</text>
        )}

        {/* ---- BOTTOM (defending) HALF ---- */}
        {!attackingHalfOnly && (
          <>
            {/* 65m line (bottom half side) */}
            <line x1="25" y1="395" x2="425" y2="395" stroke="white" strokeWidth="1" />
            {showLabels && (
              <text x="435" y="400" fill="white" fontSize="16" fontWeight="bold">65m</text>
            )}

            {/* 45m line (bottom) */}
            <line x1="25" y1="484" x2="425" y2="484" stroke="white" strokeWidth="1" />
            {showLabels && (
              <text x="435" y="489" fill="white" fontSize="16" fontWeight="bold">45m</text>
            )}

            {/* 21m arc (bottom, radius 58) */}
            <path d="M 167 595 A 58 58 0 0 1 283 595" fill="none" stroke="white" strokeWidth="1" />

            {/* 40m arc (bottom, radius 178) */}
            <path d="M 71 595 A 178 178 0 0 1 379 595" fill="none" stroke="white" strokeWidth="1" />

            {/* 20m line (bottom) */}
            <line x1="25" y1="595" x2="425" y2="595" stroke="white" strokeWidth="1" />
            {showLabels && (
              <text x="435" y="600" fill="white" fontSize="16" fontWeight="bold">20m</text>
            )}

            {/* 13m line (bottom) */}
            <line x1="25" y1="626" x2="425" y2="626" stroke="white" strokeWidth="1" />
            {showLabels && (
              <text x="435" y="631" fill="white" fontSize="16" fontWeight="bold">13m</text>
            )}

            {/* Small rectangle (bottom goal area) */}
            <rect x="175" y="626" width="100" height="58" fill="none" stroke="white" strokeWidth="1" />

            {/* Penalty spot (bottom) */}
            <circle cx="225" cy="635" r="3" fill="white" />

            {/* Goal line (bottom, gold) */}
            <line x1="195" y1="684" x2="255" y2="684" stroke="#FFD700" strokeWidth="5" strokeLinecap="round" />

            {/* Goal posts (bottom) */}
            <circle cx="195" cy="684" r="3" fill="white" />
            <circle cx="255" cy="684" r="3" fill="white" />
          </>
        )}

        {/* Goal line (top, gold) */}
        <line x1="195" y1="40" x2="255" y2="40" stroke="#FFD700" strokeWidth="5" strokeLinecap="round" />

        {/* Goal posts (top) */}
        <circle cx="195" cy="40" r="3" fill="white" />
        <circle cx="255" cy="40" r="3" fill="white" />

        {/* Composable children: ZoneOverlay, ShotMarkers, etc. */}
        {children}
      </svg>
    </div>
  );
}
