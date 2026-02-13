'use client';

import { useState, useMemo } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useAuth } from '@/hooks/useAuth';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ReportModal({ open, onClose }: ReportModalProps) {
  const { user, displayName } = useAuth();
  const sessions = useSessionStore((s) => s.sessions);
  const trainingLogs = useSessionStore((s) => s.trainingLogs);

  // Default to previous month
  const defaultMonth = useMemo(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yyyy = prev.getFullYear();
    const mm = String(prev.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Parse yyyy / mm from the month input
  const yyyy = parseInt(selectedMonth.split('-')[0]);
  const mm = parseInt(selectedMonth.split('-')[1]);
  const prefix = `${yyyy}-${String(mm).padStart(2, '0')}`;

  // Preview stats
  const monthSessions = sessions.filter((s) => s.date && s.date.startsWith(prefix));
  const matchCount = monthSessions.filter((s) => s.type === 'match').length;
  const practiceCount = monthSessions.filter((s) => s.type === 'practice').length;
  const totalShots = monthSessions.reduce((sum, s) => sum + (s.shots || []).length, 0);
  const trainingCount = trainingLogs.filter((l) => l.date && l.date.startsWith(prefix)).length;

  const noData = totalShots === 0 && monthSessions.length === 0 && trainingCount === 0;

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      const { generateMonthlyReport } = await import('./PdfGenerator');
      const metadata = user?.user_metadata || {};
      await generateMonthlyReport({
        sessions,
        trainingLogs,
        playerName: displayName || 'Player',
        playerClub: metadata.club || '',
        playerPosition: metadata.primary_position || '',
        yyyy,
        mm,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-text">Monthly Report</h2>
          <p className="text-sm text-text-muted mt-1">Generate a PDF performance report</p>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Month picker */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Select Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Preview stats */}
          <div className="flex gap-3 flex-wrap justify-center">
            {[
              { value: matchCount, label: 'Matches' },
              { value: practiceCount, label: 'Practices' },
              { value: totalShots, label: 'Shots' },
              { value: trainingCount, label: 'Training' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center px-3 py-2 bg-grey-light rounded-lg min-w-[68px]"
              >
                <div className="text-xl font-bold text-primary">{stat.value}</div>
                <div className="text-xs text-text-muted">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Error / no data */}
          {noData && (
            <p className="text-sm text-danger text-center">No data found for this month.</p>
          )}
          {error && (
            <p className="text-sm text-danger text-center">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2 text-sm rounded-lg border border-border text-text hover:bg-grey-light disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || noData}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 cursor-pointer"
          >
            {generating ? 'Generating...' : 'Generate PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
