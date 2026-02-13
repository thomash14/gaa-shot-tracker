'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { ReportModal } from '@/components/report';

export default function ProfileMenu() {
  const { user, initialising, displayName, initials, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  async function handleLogout() {
    setIsOpen(false);
    await logout();
    router.push('/auth/login');
  }

  // Don't render while auth is initialising
  if (initialising) {
    return (
      <div className="w-9 h-9 rounded-full bg-grey animate-pulse" />
    );
  }

  // If not logged in, show login link
  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="text-sm font-medium text-primary hover:underline"
      >
        Log In
      </Link>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar button + name (sidebar shows inline, header shows circle only) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 cursor-pointer group"
        aria-label="Profile menu"
      >
        <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0 group-hover:bg-primary-dark transition-colors">
          {initials}
        </div>
        {/* Show name beside avatar on desktop sidebar */}
        <div className="hidden md:block text-left min-w-0">
          <p className="text-sm font-medium text-text truncate">{displayName}</p>
          <p className="text-xs text-text-muted truncate">{user.email}</p>
        </div>
      </button>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />

      {/* Dropdown — opens upward in sidebar (bottom), downward in header (top) */}
      {isOpen && (
        <div className="absolute right-0 md:left-0 md:right-auto md:bottom-full md:mb-2 top-full md:top-auto mt-2 md:mt-0 w-52 bg-surface rounded-xl shadow-lg border border-border py-2 z-50">
          <div className="px-4 py-2 border-b border-border">
            <p className="text-sm font-semibold text-text truncate">{displayName}</p>
            <p className="text-xs text-text-muted truncate">{user.email}</p>
          </div>
          <Link
            href="/analytics"
            className="block px-4 py-2 text-sm text-text hover:bg-grey-light"
            onClick={() => setIsOpen(false)}
          >
            My Stats
          </Link>
          <Link
            href="/sessions"
            className="block px-4 py-2 text-sm text-text hover:bg-grey-light"
            onClick={() => setIsOpen(false)}
          >
            Session History
          </Link>
          <Link
            href="/team"
            className="block px-4 py-2 text-sm text-text hover:bg-grey-light"
            onClick={() => setIsOpen(false)}
          >
            My Team
          </Link>
          <button
            className="w-full text-left px-4 py-2 text-sm text-text hover:bg-grey-light cursor-pointer"
            onClick={() => {
              setReportOpen(true);
              setIsOpen(false);
            }}
          >
            Monthly Report
          </button>
          <button
            className="w-full flex items-center justify-between px-4 py-2 text-sm text-text hover:bg-grey-light cursor-pointer"
            onClick={toggleTheme}
          >
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            {isDark ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <div className="border-t border-border mt-1 pt-1">
            <button
              className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-grey-light cursor-pointer"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
