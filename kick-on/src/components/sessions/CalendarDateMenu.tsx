'use client';

import { useEffect, useRef } from 'react';

interface CalendarDateMenuProps {
  dateStr: string;
  anchorEl: HTMLElement | null;
  hasShotSessions: boolean;
  onViewSessions: () => void;
  onLogTraining: () => void;
  onClose: () => void;
}

export default function CalendarDateMenu({
  dateStr,
  anchorEl,
  hasShotSessions,
  onViewSessions,
  onLogTraining,
  onClose,
}: CalendarDateMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Position near anchor
  useEffect(() => {
    if (!anchorEl || !menuRef.current) return;
    const rect = anchorEl.getBoundingClientRect();
    const menu = menuRef.current;

    let top = rect.bottom + 4;
    let left = rect.left;

    // Keep within viewport
    if (left + 220 > window.innerWidth) left = window.innerWidth - 225;
    if (left < 5) left = 5;
    if (top + 150 > window.innerHeight) top = rect.top - 150;

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }, [anchorEl]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid immediate trigger from the click that opened the menu
    const timer = setTimeout(() => {
      document.addEventListener('click', handler);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handler);
    };
  }, [onClose]);

  const formattedDate = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-surface rounded-xl shadow-lg border border-grey-light min-w-[200px] py-1 animate-in fade-in"
    >
      <div className="px-3 py-2 text-xs font-semibold text-text-muted border-b border-grey-light">
        {formattedDate}
      </div>

      {hasShotSessions && (
        <button
          onClick={() => {
            onClose();
            onViewSessions();
          }}
          className="w-full text-left px-3 py-2 text-sm hover:bg-grey-light transition-colors flex items-center gap-2"
        >
          <span>📊</span> View Sessions
        </button>
      )}

      <button
        onClick={() => {
          onClose();
          onLogTraining();
        }}
        className="w-full text-left px-3 py-2 text-sm hover:bg-grey-light transition-colors flex items-center gap-2"
      >
        <span>📋</span> Log Training Session
      </button>
    </div>
  );
}
