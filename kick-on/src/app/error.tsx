'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="bg-surface rounded-2xl shadow-sm p-8 max-w-md w-full space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-danger/10 flex items-center justify-center">
          <span className="text-danger text-xl font-bold">!</span>
        </div>
        <h2 className="text-lg font-bold text-text">Something went wrong</h2>
        <p className="text-sm text-text-muted">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
