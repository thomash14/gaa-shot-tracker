'use client';

/**
 * Legend for shot map markers showing shapes (shot type) and colours (result).
 * Compact inline layout suitable for placement below pitch maps.
 */
export default function ShotMapLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3 text-xs text-text-muted">
      {/* Shapes */}
      <span className="inline-flex items-center gap-1">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="4" fill="#999" stroke="#333" strokeWidth="1" />
        </svg>
        In-Play
      </span>
      <span className="inline-flex items-center gap-1">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <polygon points="5,1 1,9 9,9" fill="#999" stroke="#333" strokeWidth="1" />
        </svg>
        Placed Ball
      </span>
      <span className="inline-flex items-center gap-1">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect x="1" y="1" width="8" height="8" fill="#999" stroke="#333" strokeWidth="1" />
        </svg>
        Goal
      </span>

      {/* Divider */}
      <span className="text-grey">|</span>

      {/* Colours */}
      <span className="inline-flex items-center gap-1">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-white border border-grey"></span>
        Scored
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-danger"></span>
        Missed
      </span>
    </div>
  );
}
