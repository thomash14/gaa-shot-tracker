'use client';

export type HalfView = '1st' | '2nd' | 'both';

interface HalfViewToggleProps {
  value: HalfView;
  onChange: (value: HalfView) => void;
}

const OPTIONS: { value: HalfView; label: string }[] = [
  { value: '1st', label: '1st Half' },
  { value: '2nd', label: '2nd Half' },
  { value: 'both', label: 'Both' },
];

export default function HalfViewToggle({ value, onChange }: HalfViewToggleProps) {
  return (
    <div className="flex gap-1.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer ${
            value === opt.value
              ? 'bg-primary text-white'
              : 'bg-grey-light text-text-muted hover:text-text'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
