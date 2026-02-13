import { Suspense } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import LoadingOverlay from '@/components/layout/LoadingOverlay';
import SyncProvider from '@/components/layout/SyncProvider';

export const metadata: Metadata = {
  title: 'Kick On — GAA Shot Tracker',
  description:
    'Track and analyse your GAA shooting performance across practice sessions and matches.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <LoadingOverlay />
        <SyncProvider />
        <div className="flex min-h-dvh">
          {/* Desktop sidebar */}
          <Suspense>
            <Sidebar />
          </Suspense>

          {/* Main content area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile header */}
            <Header />

            {/* Page content */}
            <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6 overflow-y-auto">
              <div className="mx-auto max-w-5xl">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
