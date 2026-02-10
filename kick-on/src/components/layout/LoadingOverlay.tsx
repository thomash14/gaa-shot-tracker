'use client';

import { useUiStore } from '@/store/uiStore';

export default function LoadingOverlay() {
  const { loading, loadingText } = useUiStore();

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="w-10 h-10 border-4 border-grey-light border-t-primary rounded-full animate-spin" />
      <p className="mt-4 text-sm text-text-muted">{loadingText}</p>
    </div>
  );
}
