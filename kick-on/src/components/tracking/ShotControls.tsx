'use client';

import type { ShotCategoryType, ShotForType, FootType, HalfType } from '@/hooks/useShots';
import { getShotTypeOptions } from '@/hooks/useShots';

interface ShotControlsProps {
  isMatch: boolean;
  foot: FootType;
  half: HalfType;
  shotFor: ShotForType;
  shotCategory: ShotCategoryType;
  shotType: string;
  onFootChange: (foot: FootType) => void;
  onHalfChange: (half: HalfType) => void;
  onShotForChange: (shotFor: ShotForType) => void;
  onShotCategoryChange: (cat: ShotCategoryType) => void;
  onShotTypeChange: (type: string) => void;
}

function RadioGroup<T extends string>({
  name,
  value,
  options,
  onChange,
  disabled,
}: {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
            value === opt.value
              ? 'bg-primary text-white'
              : 'bg-grey-light text-text-muted hover:text-text'
          } ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
            disabled={disabled}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

export default function ShotControls({
  isMatch,
  foot,
  half,
  shotFor,
  shotCategory,
  shotType,
  onFootChange,
  onHalfChange,
  onShotForChange,
  onShotCategoryChange,
  onShotTypeChange,
}: ShotControlsProps) {
  const isFisted = shotType === 'fisted';
  const shotTypeOptions = getShotTypeOptions(shotCategory);
  const showShotTypeDropdown = shotTypeOptions.length > 0;

  return (
    <div className="space-y-2">
      {/* Row 1: Foot + Half (match only) */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className={isFisted ? 'opacity-40 pointer-events-none' : ''}>
          <span className="text-[10px] font-semibold text-text-muted mr-1.5">Foot:</span>
          <RadioGroup
            name="foot"
            value={foot === 'fisted' ? 'right' : foot}
            options={[
              { value: 'right' as FootType, label: 'Right' },
              { value: 'left' as FootType, label: 'Left' },
            ]}
            onChange={onFootChange}
            disabled={isFisted}
          />
        </div>

        {isMatch && (
          <div>
            <span className="text-[10px] font-semibold text-text-muted mr-1.5">Half:</span>
            <RadioGroup
              name="half"
              value={half ?? '1st'}
              options={[
                { value: '1st' as NonNullable<HalfType>, label: '1st' },
                { value: '2nd' as NonNullable<HalfType>, label: '2nd' },
              ]}
              onChange={(v) => onHalfChange(v as HalfType)}
            />
          </div>
        )}
      </div>

      {/* Row 2: Shot Category + Shot For (match) + Shot Type */}
      <div className="flex gap-3 items-center flex-wrap">
        <div>
          <span className="text-[10px] font-semibold text-text-muted mr-1.5">Category:</span>
          <RadioGroup
            name="category"
            value={shotCategory}
            options={[
              { value: 'in-play' as ShotCategoryType, label: 'In-Play' },
              { value: 'free-kick' as ShotCategoryType, label: 'Free' },
              { value: '45' as ShotCategoryType, label: '45' },
            ]}
            onChange={onShotCategoryChange}
          />
        </div>

        {isMatch && (
          <div>
            <span className="text-[10px] font-semibold text-text-muted mr-1.5">For:</span>
            <RadioGroup
              name="shotFor"
              value={shotFor}
              options={[
                { value: 'point' as ShotForType, label: 'Point' },
                { value: 'goal' as ShotForType, label: 'Goal' },
              ]}
              onChange={onShotForChange}
            />
          </div>
        )}

        {showShotTypeDropdown && (
          <div>
            <span className="text-[10px] font-semibold text-text-muted mr-1.5">Type:</span>
            <select
              value={shotType}
              onChange={(e) => onShotTypeChange(e.target.value)}
              className="bg-surface border border-grey rounded-md px-2 py-1 text-xs"
            >
              {shotTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
