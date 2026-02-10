'use client';

import Link from 'next/link';

/**
 * Quick-action buttons at the bottom of the dashboard.
 * Ported from the dashboard's "Start Practice" / "Track Match" buttons.
 */

export default function QuickActions() {
  return (
    <div className="flex gap-3 flex-wrap">
      <Link
        href="/track?type=practice"
        className="flex-1 min-w-[140px] py-3 px-4 rounded-xl bg-primary text-white font-semibold text-sm text-center hover:bg-primary-dark transition-colors"
      >
        Start Practice
      </Link>
      <Link
        href="/track?type=match"
        className="flex-1 min-w-[140px] py-3 px-4 rounded-xl border-2 border-primary text-primary font-semibold text-sm text-center hover:bg-primary hover:text-white transition-colors"
      >
        Track Match
      </Link>
    </div>
  );
}
