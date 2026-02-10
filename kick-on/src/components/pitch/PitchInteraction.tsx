'use client';

import { useRef, useCallback, useEffect } from 'react';
import { SvgPitch, ShotMarker, HalfSelector } from '@/components/pitch';
import type { Shot } from '@/types';
import type { PendingShot, HalfType } from '@/hooks/useShots';
import { getGoalSvgCoords } from '@/hooks/useShots';

interface PitchInteractionProps {
  shots: Shot[];
  pendingShot: PendingShot | null;
  batchPending: PendingShot | null;
  isMatch: boolean;
  half: HalfType;
  isDraggingRef: React.MutableRefObject<boolean>;
  onPitchClick: (xPct: number, yPct: number) => void;
  onDragUpdate: (xPct: number, yPct: number) => void;
  onHalfChange: (half: HalfType) => void;
  onBatchOpen: () => void;
}

/**
 * Interactive pitch wrapper: handles click-to-place, drag-to-reposition,
 * distance line, pending marker, and existing shot markers.
 */
export default function PitchInteraction({
  shots,
  pendingShot,
  batchPending,
  isMatch,
  half,
  isDraggingRef,
  onPitchClick,
  onDragUpdate,
  onHalfChange,
  onBatchOpen,
}: PitchInteractionProps) {
  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const dragActiveRef = useRef(false);

  // The active pending (either single or batch)
  const activePending = pendingShot || batchPending;

  // -------------------------------------------------------------------------
  // Pitch click handler
  // -------------------------------------------------------------------------
  const handlePitchClick = useCallback(
    (xPct: number, yPct: number) => {
      if (isDraggingRef.current) return;
      onPitchClick(xPct, yPct);
    },
    [isDraggingRef, onPitchClick],
  );

  // -------------------------------------------------------------------------
  // Drag handlers (via document-level listeners)
  // -------------------------------------------------------------------------
  const getSvgRect = useCallback(() => {
    const wrapper = svgWrapperRef.current;
    if (!wrapper) return null;
    const svg = wrapper.querySelector('svg');
    return svg?.getBoundingClientRect() ?? null;
  }, []);

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      const rect = getSvgRect();
      if (!rect) return;
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      onDragUpdate(x, y);
    },
    [getSvgRect, onDragUpdate],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragActiveRef.current) return;
      handleDragMove(e.clientX, e.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragActiveRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);
    };
    const onEnd = () => {
      dragActiveRef.current = false;
      isDraggingRef.current = false;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchend', onEnd);
    };
  }, [handleDragMove, isDraggingRef]);

  // Start dragging on pending marker mousedown/touchstart
  const startDrag = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      dragActiveRef.current = true;
      isDraggingRef.current = true;
    },
    [isDraggingRef],
  );

  // -------------------------------------------------------------------------
  // Distance line data
  // -------------------------------------------------------------------------
  const distanceLine = activePending
    ? (() => {
        const svgX = (activePending.x / 100) * 500;
        const svgY = (activePending.y / 100) * 725;
        const { goalX, goalY } = getGoalSvgCoords(activePending.y);
        const dx = goalX - svgX;
        const dy = goalY - svgY;
        const lineLength = Math.sqrt(dx * dx + dy * dy);
        const midX = (svgX + goalX) / 2;
        const midY = (svgY + goalY) / 2;
        const offsetDist = 25;
        const perpX = lineLength > 0 ? (-dy / lineLength) * offsetDist : 0;
        const perpY = lineLength > 0 ? (dx / lineLength) * offsetDist : 0;
        return {
          x1: svgX, y1: svgY, x2: goalX, y2: goalY,
          labelX: midX + perpX, labelY: midY + perpY,
          distanceText: activePending.distance.toFixed(1) + 'm',
        };
      })()
    : null;

  // -------------------------------------------------------------------------
  // Batch marker double-click / long-press
  // -------------------------------------------------------------------------
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleBatchDblClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (batchPending) onBatchOpen();
    },
    [batchPending, onBatchOpen],
  );

  const handleBatchTouchStart = useCallback(
    (e: React.TouchEvent) => {
      longPressTimerRef.current = setTimeout(() => {
        if (batchPending) onBatchOpen();
      }, 500);
    },
    [batchPending, onBatchOpen],
  );

  const handleBatchTouchEnd = useCallback(() => {
    clearTimeout(longPressTimerRef.current);
  }, []);

  return (
    <div ref={svgWrapperRef} className="relative">
      <SvgPitch onPitchClick={handlePitchClick}>
        {/* Existing shot markers */}
        {shots.map((shot, i) => (
          <ShotMarker
            key={`shot-${shot.timestamp}-${i}`}
            shot={shot}
            mirror={false}
          />
        ))}

        {/* Distance line */}
        {distanceLine && (
          <>
            <line
              x1={distanceLine.x1}
              y1={distanceLine.y1}
              x2={distanceLine.x2}
              y2={distanceLine.y2}
              stroke="#000000"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <text
              x={distanceLine.labelX}
              y={distanceLine.labelY}
              fill="#000000"
              fontSize="16"
              fontWeight="bold"
              textAnchor="middle"
            >
              {distanceLine.distanceText}
            </text>
          </>
        )}

        {/* Pending marker (single) */}
        {pendingShot && (
          <circle
            cx={(pendingShot.x / 100) * 500}
            cy={(pendingShot.y / 100) * 725}
            r={8}
            fill="#000000"
            stroke="#333"
            strokeWidth={2}
            style={{ cursor: 'move' }}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
          />
        )}

        {/* Pending marker (batch) */}
        {batchPending && (
          <circle
            cx={(batchPending.x / 100) * 500}
            cy={(batchPending.y / 100) * 725}
            r={8}
            fill="#000000"
            stroke="#333"
            strokeWidth={2}
            style={{ cursor: 'move' }}
            onMouseDown={startDrag}
            onTouchStart={(e) => {
              startDrag(e);
              handleBatchTouchStart(e);
            }}
            onTouchEnd={handleBatchTouchEnd}
            onDoubleClick={handleBatchDblClick}
          >
            <title>Double-click or long-press to enter batch shots</title>
          </circle>
        )}
      </SvgPitch>

      {/* Half selector overlay (match mode) */}
      {isMatch && (
        <HalfSelector
          selectedHalf={half ?? '1st'}
          onSelectHalf={(h) => onHalfChange(h as HalfType)}
        />
      )}
    </div>
  );
}
