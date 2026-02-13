'use client';

/**
 * 1st/2nd half toggle overlay for match mode.
 *
 * Renders two overlay panels (top half and bottom half) positioned absolutely
 * over the pitch SVG. Each shows which scoring half is active and allows the
 * user to switch.
 *
 * In the original app the top overlay shows the SELECTED half, and the bottom
 * overlay shows the OPPOSITE half (you can't score at both ends in the same
 * half). Clicking either overlay toggles to that half.
 *
 * Usage:
 *   <div className="relative">
 *     <SvgPitch> ... </SvgPitch>
 *     <HalfSelector selectedHalf={half} onSelectHalf={setHalf} />
 *   </div>
 */

type Half = '1st' | '2nd';

interface HalfSelectorProps {
  /** Currently selected half. */
  selectedHalf: Half;
  /** Callback when the user selects a half. */
  onSelectHalf: (half: Half) => void;
}

export default function HalfSelector({ selectedHalf, onSelectHalf }: HalfSelectorProps) {
  // Top overlay: shows the selected half (scoring end)
  // Bottom overlay: shows the opposite half
  const topHalf = selectedHalf;
  const bottomHalf: Half = selectedHalf === '1st' ? '2nd' : '1st';

  return (
    <>
      {/* Top half overlay */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 pointer-events-auto"
        style={{ top: '2%' }}
      >
        <span className="text-[10px] font-bold text-white drop-shadow-md">Scoring Half:</span>
        <div className="flex gap-1">
          <HalfButton
            label="1st Half"
            active={topHalf === '1st'}
            onClick={() => onSelectHalf('1st')}
          />
          <HalfButton
            label="2nd Half"
            active={topHalf === '2nd'}
            onClick={() => onSelectHalf('2nd')}
          />
        </div>
      </div>

      {/* Bottom half overlay */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 pointer-events-auto"
        style={{ bottom: '2%' }}
      >
        <span className="text-[10px] font-bold text-white drop-shadow-md">Scoring Half:</span>
        <div className="flex gap-1">
          <HalfButton
            label="1st Half"
            active={bottomHalf === '1st'}
            onClick={() => onSelectHalf(bottomHalf === '1st' ? '1st' : '2nd')}
          />
          <HalfButton
            label="2nd Half"
            active={bottomHalf === '2nd'}
            onClick={() => onSelectHalf(bottomHalf === '2nd' ? '2nd' : '1st')}
          />
        </div>
      </div>
    </>
  );
}

function HalfButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-2 py-0.5 text-[10px] font-medium rounded cursor-pointer transition-colors
        ${active
          ? 'bg-primary text-white'
          : 'bg-surface/80 text-text hover:bg-surface'
        }
      `}
    >
      {label}
    </button>
  );
}
