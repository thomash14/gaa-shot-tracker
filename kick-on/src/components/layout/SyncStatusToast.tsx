'use client';

import { useEffect, useState } from 'react';
import { useUiStore } from '@/store/uiStore';

export default function SyncStatusToast() {
  const syncStatus = useUiStore((s) => s.syncStatus);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (syncStatus === 'idle') {
      setVisible(false);
    } else {
      setVisible(true);
    }
  }, [syncStatus]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {syncStatus === 'syncing' && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface shadow-lg border border-border text-sm font-medium text-text">
          <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Syncing your data...
        </div>
      )}
      {syncStatus === 'synced' && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface shadow-lg border border-border text-sm font-medium text-[#4CAF50]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          All data synced
        </div>
      )}
      {syncStatus === 'error' && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface shadow-lg border border-amber-300 dark:border-amber-700 text-sm font-medium text-amber-600 dark:text-amber-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3l9.66 16.5H2.34L12 3z" />
          </svg>
          Sync failed — will retry
        </div>
      )}
    </div>
  );
}
