'use client';

import { useEffect } from 'react';

export default function TrackError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Track error:', error);
  }, [error]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-primary dark:text-text">Track</h2>
      <div className="bg-surface rounded-2xl shadow-sm p-8 text-center space-y-4">
        <p className="text-sm text-text-muted">
          Failed to load tracking. {error.message}
        </p>
        <button
          onClick={reset}
          className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
