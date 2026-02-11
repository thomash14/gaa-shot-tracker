'use client';

import { usePathname } from 'next/navigation';
import ProfileMenu from './ProfileMenu';

export default function Header() {
  const pathname = usePathname();

  // Hide header on auth pages (login, signup, etc.)
  if (pathname.startsWith('/auth')) return null;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-border md:hidden">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-primary">KICK ON</h1>
      </div>
      <ProfileMenu />
    </header>
  );
}
