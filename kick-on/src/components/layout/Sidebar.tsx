'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTeamStore } from '@/store/teamStore';
import ProfileMenu from './ProfileMenu';

interface NavItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/track?type=practice', label: 'Track Practice', shortLabel: 'Practice', icon: '🏋️' },
  { href: '/track?type=match', label: 'Track Match', shortLabel: 'Match', icon: '⚽' },
  { href: '/sessions', label: 'Sessions', icon: '📋' },
  { href: '/analytics', label: 'Stats', icon: '📈' },
  { href: '/team', label: 'Team', icon: '👥' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentMembership = useTeamStore((s) => s.currentMembership);
  const hasPlayerMembership = useTeamStore((s) => s.hasPlayerMembership);

  // Hide sidebar on auth pages (login, signup, etc.)
  if (pathname.startsWith('/auth')) return null;

  // Coach-only accounts (no player membership on any team) see Home + Team nav items
  const isCoachOnly = currentMembership?.role === 'coach' && !hasPlayerMembership;
  const visibleItems = isCoachOnly
    ? navItems.filter((item) => item.href === '/' || item.href === '/team')
    : navItems;

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    const [path, query] = href.split('?');
    if (!pathname.startsWith(path)) return false;
    // If href has query params, they must match too
    if (query) {
      const hrefParams = new URLSearchParams(query);
      for (const [key, value] of hrefParams) {
        if (searchParams.get(key) !== value) return false;
      }
    }
    return true;
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white/95 backdrop-blur-sm border-r border-border sticky top-0 h-dvh shrink-0 z-20">
        <div className="px-4 py-5 border-b border-border">
          <h1 className="text-xl font-bold text-primary">KICK ON</h1>
          <p className="text-xs text-text-muted mt-0.5">GAA Shot Tracker</p>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-primary text-white'
                  : 'text-text hover:bg-grey-light'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-border">
          <ProfileMenu />
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border flex justify-around py-1 z-30">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs transition-colors ${
              isActive(item.href)
                ? 'text-primary font-semibold'
                : 'text-text-muted'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="leading-tight">{item.shortLabel ?? item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
