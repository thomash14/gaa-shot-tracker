'use client';

import { useRef, useCallback } from 'react';
import type { DrillSpot, DrillProgress, DrillSettings, SpotScoreSingle } from '@/types';

function isBothFeetScore(score: DrillProgress[string][string | number]): score is { right: SpotScoreSingle; left: SpotScoreSingle } {
  return !!score && 'right' in score && 'left' in score;
}

interface DrillSpotsProps {
  spots: DrillSpot[];
  progress: Record<string | number, DrillProgress[string][string | number]>;
  settings: DrillSettings;
  onSpotClick: (spot: DrillSpot) => void;
}

/**
 * Renders drill spot markers and distance lines as SVG elements.
 * Must be placed inside an <SvgPitch> as children.
 */
export default function DrillSpots({ spots, progress, settings, onSpotClick }: DrillSpotsProps) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressFiredRef = useRef(false);

  const handleTouchStart = useCallback((spot: DrillSpot) => {
    longPressFiredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      onSpotClick(spot);
    }, 500);
  }, [onSpotClick]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimerRef.current);
  }, []);

  const handleClick = useCallback((spot: DrillSpot, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!longPressFiredRef.current) {
      onSpotClick(spot);
    }
  }, [onSpotClick]);

  return (
    <>
      {spots.map((spot) => {
        const svgX = (spot.x / 100) * 500;
        const svgY = (spot.y / 100) * 725;
        const spotScore = progress[spot.id];

        const isCompleted = spotScore && (
          (settings.footOption === 'both' && isBothFeetScore(spotScore) && spotScore.right && spotScore.left) ||
          (settings.footOption !== 'both' && !isBothFeetScore(spotScore) && spotScore.total > 0)
        );
        const isPartial = spotScore && !isCompleted;

        let scoreLabel = '';
        if (spotScore) {
          if (isBothFeetScore(spotScore)) {
            const scored = (spotScore.right?.scored || 0) + (spotScore.left?.scored || 0);
            const total = (spotScore.right?.total || 0) + (spotScore.left?.total || 0);
            scoreLabel = `${scored}/${total}`;
          } else {
            scoreLabel = `${spotScore.scored}/${spotScore.total}`;
          }
        }

        const lineColor = isCompleted ? '#4CAF50' : isPartial ? '#FF9800' : '#333';
        const spotColor = isCompleted ? '#4CAF50' : isPartial ? '#FF9800' : '#2a5298';

        return (
          <g key={`drill-spot-${spot.id}`}>
            {/* Distance line to goal */}
            <line
              x1={svgX}
              y1={svgY}
              x2={225}
              y2={40}
              stroke={lineColor}
              strokeWidth={1.5}
              strokeDasharray="5,5"
              opacity={0.6}
            />

            {/* Spot marker */}
            <circle
              cx={svgX}
              cy={svgY}
              r={14}
              fill={spotColor}
              stroke={isCompleted ? '#388E3C' : isPartial ? '#E65100' : '#1a3a7a'}
              strokeWidth={2}
              style={{ cursor: 'pointer' }}
              onClick={(e) => handleClick(spot, e)}
              onDoubleClick={(e) => { e.stopPropagation(); onSpotClick(spot); }}
              onTouchStart={() => handleTouchStart(spot)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
            />

            {/* Spot label (number or score) */}
            <text
              x={svgX}
              y={svgY + 4}
              fill="white"
              fontSize={scoreLabel ? '10' : '12'}
              fontWeight="bold"
              textAnchor="middle"
              style={{ pointerEvents: 'none' }}
            >
              {scoreLabel || spot.id}
            </text>

            {/* Distance label below spot */}
            <text
              x={svgX}
              y={svgY + 30}
              fill="white"
              fontSize="10"
              textAnchor="middle"
              opacity={0.8}
              style={{ pointerEvents: 'none' }}
            >
              {settings.distance}m
            </text>
          </g>
        );
      })}
    </>
  );
}
