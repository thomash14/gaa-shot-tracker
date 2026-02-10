'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { FilterOption } from '@/lib/filterOptions';

/**
 * Multi-select checkbox dropdown.
 * Ported from multiselect.js — supports grouped options, select-all toggle,
 * and the "all selected = no filter" semantic.
 */

interface MultiSelectProps {
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  label?: string;
}

export default function MultiSelect({ options, selected, onChange, label }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedSet = new Set(selected);
  const allSelected = selected.length === options.length || selected.length === 0;

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [open]);

  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      // Deselect all
      onChange([]);
    } else {
      // Select all
      onChange(options.map((o) => o.value));
    }
  }, [allSelected, onChange, options]);

  const handleToggle = useCallback(
    (value: string) => {
      const next = new Set(selectedSet);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      onChange([...next]);
    },
    [selectedSet, onChange]
  );

  // Trigger label
  let triggerText: string;
  if (allSelected) {
    triggerText = 'All';
  } else if (selected.length === 0) {
    triggerText = 'None';
  } else if (selected.length <= 2) {
    triggerText = options
      .filter((o) => selectedSet.has(o.value))
      .map((o) => o.label)
      .join(', ');
  } else {
    triggerText = `${selected.length} selected`;
  }

  // Group rendering
  let lastGroup: string | undefined;

  return (
    <div ref={containerRef} className="relative inline-block min-w-[100px]">
      {label && (
        <span className="text-xs text-text-muted font-medium mr-1">{label}</span>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ms-trigger bg-surface border border-grey rounded-lg px-3 py-1.5 text-xs text-text cursor-pointer text-left min-w-[80px]"
      >
        {triggerText}
        <span className="ml-1 opacity-50">{open ? '\u25B2' : '\u25BC'}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-surface border border-grey rounded-lg shadow-lg max-h-64 overflow-y-auto min-w-[160px]">
          {/* Select All */}
          <label className="flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b border-grey-light cursor-pointer hover:bg-grey-light">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleToggleAll}
              className="accent-primary"
            />
            Select All
          </label>

          {options.map((opt) => {
            const showGroupHeader = opt.group && opt.group !== lastGroup;
            if (showGroupHeader) lastGroup = opt.group;
            return (
              <div key={opt.value}>
                {showGroupHeader && (
                  <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-grey-light">
                    {opt.group}
                  </div>
                )}
                <label className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-grey-light">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(opt.value)}
                    onChange={() => handleToggle(opt.value)}
                    className="accent-primary"
                  />
                  {opt.label}
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
