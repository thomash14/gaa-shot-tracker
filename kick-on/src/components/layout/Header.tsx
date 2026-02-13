'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUiStore } from '@/store/uiStore';
import ProfileMenu from './ProfileMenu';

export default function Header() {
  const pathname = usePathname();
  const offlineMode = useUiStore((s) => s.offlineMode);
  const pendingSyncCount = useUiStore((s) => s.pendingSyncCount);

  // Hide header on auth pages (login, signup, etc.)
  if (pathname.startsWith('/auth')) return null;

  return (
    <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm border-b border-border md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/"><h1 className="text-lg font-bold text-primary dark:text-text">KICK ON</h1></Link>
          {offlineMode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Offline
            </span>
          )}
          {!offlineMode && pendingSyncCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[10px] font-semibold">
              Syncing {pendingSyncCount}
            </span>
          )}
        </div>
        <ProfileMenu />
      </div>
    </header>
  );
}
