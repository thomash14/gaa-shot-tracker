'use client';

/**
 * 9-zone overlay rendered as an SVG <g> inside SvgPitch.
 * Shows the attacking-half zone boundaries with semi-transparent fills
 * and zone number labels.
 *
 * SVG paths ported exactly from the #zoneOverlays group in index.html.
 *
 * Usage:
 *   <SvgPitch>
 *     <ZoneOverlay visible={showZones} />
 *   </SvgPitch>
 */

interface ZoneOverlayProps {
  /** Whether the overlay is visible. Default true. */
  visible?: boolean;
  /** Optional per-zone opacity overrides (keyed by zone number 1-9, value 0-1). */
  zoneOpacity?: Partial<Record<number, number>>;
  /** Optional per-zone colour overrides (keyed by zone number 1-9). */
  zoneColors?: Partial<Record<number, string>>;
}

export default function ZoneOverlay({
  visible = true,
  zoneOpacity,
  zoneColors,
}: ZoneOverlayProps) {
  if (!visible) return null;

  const color = (zone: number, fallback: string) => zoneColors?.[zone] ?? fallback;
  const opacity = (zone: number, fallback: number) => zoneOpacity?.[zone] ?? fallback;

  return (
    <g>
      {/* Zone 1 — Outside 45m */}
      <rect
        x="25" y="240" width="400" height="122"
        fill={color(1, '#9E9E9E')} opacity={opacity(1, 0.4)}
        stroke="#000" strokeWidth="1"
      />
      <text
        x="225" y="305" textAnchor="middle"
        fill="white" fontSize="24" fontWeight="bold"
        stroke="#333" strokeWidth="0.5"
      >1</text>

      {/* Zone 7 — Close Left */}
      <rect
        x="25" y="40" width="90" height="89"
        fill={color(7, '#4CAF50')} opacity={opacity(7, 0.4)}
        stroke="#000" strokeWidth="1"
      />
      <text
        x="70" y="90" textAnchor="middle"
        fill="white" fontSize="24" fontWeight="bold"
        stroke="#333" strokeWidth="0.5"
      >7</text>

      {/* Zone 8 — Close Centre */}
      <rect
        x="115" y="40" width="220" height="89"
        fill={color(8, '#8BC34A')} opacity={opacity(8, 0.4)}
        stroke="#000" strokeWidth="1"
      />
      <text
        x="225" y="90" textAnchor="middle"
        fill="white" fontSize="24" fontWeight="bold"
        stroke="#333" strokeWidth="0.5"
      >8</text>

      {/* Zone 9 — Close Right */}
      <rect
        x="335" y="40" width="90" height="89"
        fill={color(9, '#4CAF50')} opacity={opacity(9, 0.4)}
        stroke="#000" strokeWidth="1"
      />
      <text
        x="380" y="90" textAnchor="middle"
        fill="white" fontSize="24" fontWeight="bold"
        stroke="#333" strokeWidth="0.5"
      >9</text>

      {/* Zone 6 — Inside 35m Arc */}
      <path
        d="M 97 129 L 97 129 A 156 156 0 0 0 353 129 L 353 129 Z"
        fill={color(6, '#CDDC39')} opacity={opacity(6, 0.4)}
        stroke="#000" strokeWidth="1"
      />
      <text
        x="225" y="165" textAnchor="middle"
        fill="black" fontSize="20" fontWeight="bold"
      >6</text>

      {/* Zone 5 — 35m-40m Arc band */}
      <path
        d="M 71 129 A 178 178 0 0 0 379 129 L 353 129 A 156 156 0 0 1 97 129 Z"
        fill={color(5, '#FF9800')} opacity={opacity(5, 0.5)}
        stroke="#000" strokeWidth="1"
      />
      <text
        x="225" y="210" textAnchor="middle"
        fill="white" fontSize="14" fontWeight="bold"
      >5</text>

      {/* Zone 2 — Left Wing */}
      <path
        d="M 25 129 L 46 129 A 200 200 0 0 0 225 240 L 25 240 Z"
        fill={color(2, '#1565C0')} opacity={opacity(2, 0.5)}
        stroke="#000" strokeWidth="1"
      />
      <text
        x="50" y="200" textAnchor="middle"
        fill="white" fontSize="14" fontWeight="bold"
        stroke="#333" strokeWidth="0.5"
      >2</text>

      {/* Zone 3 — Centre 40m-45m (band between 40m and 45m arcs) */}
      <path
        d="M 71 129 A 178 178 0 0 0 379 129 L 404 129 A 200 200 0 0 1 46 129 Z"
        fill={color(3, '#7B1FA2')} opacity={opacity(3, 0.5)}
        stroke="#000" strokeWidth="1"
      />
      <text
        x="225" y="230" textAnchor="middle"
        fill="white" fontSize="16" fontWeight="bold"
        stroke="#333" strokeWidth="0.5"
      >3</text>

      {/* Zone 4 — Right Wing */}
      <path
        d="M 225 240 A 200 200 0 0 0 404 129 L 425 129 L 425 240 Z"
        fill={color(4, '#1565C0')} opacity={opacity(4, 0.5)}
        stroke="#000" strokeWidth="1"
      />
      <text
        x="400" y="200" textAnchor="middle"
        fill="white" fontSize="14" fontWeight="bold"
        stroke="#333" strokeWidth="0.5"
      >4</text>
    </g>
  );
}
