'use client';

import { useCloudSync } from '@/hooks/useCloudSync';

/**
 * Invisible client component that boots cloud sync on mount.
 * Place in the root layout so it runs on every authenticated page.
 */
export default function SyncProvider() {
  useCloudSync();
  return null;
}
