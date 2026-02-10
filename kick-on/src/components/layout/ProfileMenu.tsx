'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ReportModal } from '@/components/report';

export default function ProfileMenu() {
  const { user, initialising, displayName, initials, logout } = useAuth();
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
      {/* Avatar button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold cursor-pointer hover:bg-primary-dark transition-colors"
        aria-label="Profile menu"
      >
        {initials}
      </button>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-border py-2 z-50">
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
