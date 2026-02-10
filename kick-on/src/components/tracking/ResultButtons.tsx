'use client';

import { useRef, useCallback } from 'react';
import type { TrackingMode } from '@/hooks/useShots';

interface ResultButtonsProps {
  hasPending: boolean;
  trackingMode: TrackingMode;
  onTrackingModeChange: (mode: TrackingMode) => void;
  onScored: () => void;
  onMissed: () => void;
  onMissedWithDetails: () => void;
  onUndo: () => void;
  isMatch: boolean;
}

export default function ResultButtons({
  hasPending,
  trackingMode,
  onTrackingModeChange,
  onScored,
  onMissed,
  onMissedWithDetails,
  onUndo,
  isMatch,
}: ResultButtonsProps) {
  // Double-click / long-press detection for missed button
  const clickCountRef = useRef(0);
  const dblClickTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressFiredRef = useRef(false);

  const handleMissedClick = useCallback(() => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    clickCountRef.current++;
    if (clickCountRef.current === 1) {
      dblClickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
        onMissed();
      }, 300);
    } else if (clickCountRef.current === 2) {
      clearTimeout(dblClickTimerRef.current);
      clickCountRef.current = 0;
      onMissedWithDetails();
    }
  }, [onMissed, onMissedWithDetails]);

  const handleMissedTouchStart = useCallback(() => {
    longPressFiredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      onMissedWithDetails();
    }, 1000);
  }, [onMissedWithDetails]);

  const handleMissedTouchEnd = useCallback(() => {
    clearTimeout(longPressTimerRef.current);
  }, []);

  const handleMissedTouchMove = useCallback(() => {
    clearTimeout(longPressTimerRef.current);
  }, []);

  return (
    <div className="space-y-2">
      {/* Tracking mode toggle (practice only) */}
      {!isMatch && (
        <div className="flex gap-1 bg-grey-light rounded-lg p-1 max-w-[200px]">
          <button
            onClick={() => onTrackingModeChange('single')}
            className={`flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-colors ${
              trackingMode === 'single' ? 'bg-primary text-white' : 'text-text-muted'
            }`}
          >
            Single
          </button>
          <button
            onClick={() => onTrackingModeChange('batch')}
            className={`flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-colors ${
              trackingMode === 'batch' ? 'bg-primary text-white' : 'text-text-muted'
            }`}
          >
            Batch
          </button>
        </div>
      )}

      {/* Result buttons */}
      <div className="flex gap-2">
        <button
          onClick={onScored}
          disabled={!hasPending}
          className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-[#4CAF50] hover:bg-[#388E3C] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Scored
        </button>
        <button
          onClick={handleMissedClick}
          onTouchStart={handleMissedTouchStart}
          onTouchEnd={handleMissedTouchEnd}
          onTouchMove={handleMissedTouchMove}
          disabled={!hasPending}
          className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-[#f44336] hover:bg-[#d32f2f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Missed
        </button>
        <button
          onClick={onUndo}
          className="px-4 py-2.5 rounded-lg text-sm font-bold text-text-muted bg-grey-light hover:bg-grey transition-colors"
        >
          Undo
        </button>
      </div>

      {hasPending && (
        <p className="text-[10px] text-text-muted text-center">
          Double-click or long-press Missed for detailed miss info
        </p>
      )}
    </div>
  );
}
