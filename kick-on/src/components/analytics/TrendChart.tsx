'use client';

import { useState, useRef, useCallback } from 'react';

/**
 * SVG polyline trend chart.
 * Ported from renderTrendChart() in trends.js.
 */

export interface TrendDataPoint {
  date: string;
  dateStr: string;
  label: string;
  [key: string]: unknown;
}

interface TrendChartProps {
  dataPoints: TrendDataPoint[];
  valueKey: string;
  suffix?: string;
  label?: string;
  decimals?: number;
  isMatch?: boolean;
}

function formatTrendDate(dateStr: string): string {
  const parts = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1];
}

function formatTrendDateLong(dateStr: string): string {
  const parts = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1] + ' ' + parts[0];
}

export default function TrendChart({
  dataPoints,
  valueKey,
  suffix = '',
  decimals,
  isMatch = false,
}: TrendChartProps) {
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const W = 800;
  const H = 400;
  const PAD = { left: 65, right: 30, top: 30, bottom: isMatch ? 95 : 80 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const values = dataPoints.map((p) => {
    const v = p[valueKey];
    return typeof v === 'number' ? v : 0;
  });

  let minVal = Math.min(...values);
  let maxVal = Math.max(...values);
  const range = maxVal - minVal;
  if (range === 0) {
    minVal = Math.max(0, minVal - 10);
    maxVal = maxVal + 10;
  } else {
    minVal = Math.max(0, minVal - range * 0.1);
    maxVal = maxVal + range * 0.1;
  }

  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  function xPos(i: number) {
    if (dataPoints.length === 1) return PAD.left + chartW / 2;
    return PAD.left + (i / (dataPoints.length - 1)) * chartW;
  }

  function yPos(val: number) {
    return PAD.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
  }

  function fmtVal(val: number) {
    return decimals != null ? val.toFixed(decimals) : String(Math.round(val));
  }

  const handleHover = useCallback(
    (e: React.MouseEvent | React.TouchEvent, index: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      let clientX: number, clientY: number;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else return;
      setTooltipIndex(index);
      setTooltipPos({ x: clientX - rect.left, y: clientY - rect.top });
    },
    []
  );

  // Polyline points string
  const polylinePoints = dataPoints.length > 1
    ? dataPoints.map((_, i) => `${xPos(i)},${yPos(values[i])}`).join(' ')
    : '';

  // Grid lines
  const gridLines = 5;

  // Tooltip data
  const tooltipPoint = tooltipIndex !== null ? dataPoints[tooltipIndex] : null;

  return (
    <div ref={containerRef} className="relative">
      <svg
        className="w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const val = minVal + (i / gridLines) * (maxVal - minVal);
          const y = yPos(val);
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke="#eee"
                strokeWidth="1"
              />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" fill="#999" fontSize="11">
                {fmtVal(val)}
                {suffix}
              </text>
            </g>
          );
        })}

        {/* Average line */}
        <line
          x1={PAD.left}
          y1={yPos(avg)}
          x2={W - PAD.right}
          y2={yPos(avg)}
          stroke="#999"
          strokeWidth="1.5"
          strokeDasharray="6,4"
        />
        <text x={W - PAD.right + 4} y={yPos(avg) + 4} fill="#999" fontSize="10">
          avg {fmtVal(avg)}
          {suffix}
        </text>

        {/* Polyline */}
        {polylinePoints && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#4CAF50"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Data points */}
        {dataPoints.map((p, i) => {
          const x = xPos(i);
          const y = yPos(values[i]);
          return (
            <g key={i}>
              {/* Value label above */}
              <text x={x} y={y - 12} textAnchor="middle" fill="#333" fontSize="11" fontWeight="600">
                {fmtVal(values[i])}
                {suffix}
              </text>
              {/* Visible circle */}
              <circle cx={x} cy={y} r="5" fill="white" stroke="#4CAF50" strokeWidth="2" />
              {/* Hit area */}
              <circle
                cx={x}
                cy={y}
                r="20"
                fill="transparent"
                stroke="none"
                className="cursor-pointer"
                onMouseEnter={(e) => handleHover(e, i)}
                onMouseLeave={() => setTooltipIndex(null)}
                onTouchStart={(e) => handleHover(e, i)}
              />
            </g>
          );
        })}

        {/* X-axis labels */}
        {dataPoints.map((p, i) => {
          const x = xPos(i);
          const y = H - PAD.bottom + 18;
          const primaryLabel = isMatch && p.label ? p.label : p.dateStr;
          const secondaryLabel = isMatch && p.label ? p.dateStr : null;
          const rotate = dataPoints.length > 6;

          if (rotate) {
            return (
              <text
                key={i}
                x={x}
                y={y}
                textAnchor="end"
                fill="#666"
                fontSize="10"
                transform={`rotate(-45, ${x}, ${y})`}
              >
                {primaryLabel}
              </text>
            );
          }
          return (
            <g key={i}>
              <text
                x={x}
                y={y}
                textAnchor="middle"
                fill="#666"
                fontSize="11"
                fontWeight={isMatch ? '600' : 'normal'}
              >
                {primaryLabel}
              </text>
              {secondaryLabel && (
                <text x={x} y={y + 14} textAnchor="middle" fill="#999" fontSize="9">
                  {secondaryLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltipPoint && tooltipIndex !== null && (
        <div
          className="absolute z-50 bg-surface border border-grey rounded-lg shadow-lg p-3 text-xs pointer-events-none min-w-[180px]"
          style={{
            left: Math.min(tooltipPos.x + 12, (containerRef.current?.clientWidth ?? 400) - 200),
            top: tooltipPos.y - 10,
          }}
        >
          <p className="font-semibold text-primary mb-1">{tooltipPoint.label}</p>
          <p className="text-text-muted">
            Date: {formatTrendDateLong(tooltipPoint.date)}
          </p>
          {tooltipPoint.rate !== undefined && (
            <>
              <p>
                Scored: {String(tooltipPoint.scored)}/{String(tooltipPoint.total)}
              </p>
              <p>Rate: {String(tooltipPoint.rate)}%</p>
            </>
          )}
          {tooltipPoint.ptsPerShot !== undefined && (
            <p>Pts/Shot: {(tooltipPoint.ptsPerShot as number).toFixed(2)}</p>
          )}
          {tooltipPoint.inPlay !== undefined && (
            <>
              <p>Total Shots: {String(tooltipPoint.total)}</p>
              <p>In-Play: {String(tooltipPoint.inPlay)}</p>
              <p>Placed: {String(tooltipPoint.placed)}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export { formatTrendDate };
