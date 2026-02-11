'use client';

import { useState, useCallback } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import type { SessionType, MatchType, Session } from '@/types';

interface SessionControlsProps {
  onSessionStarted?: () => void;
  onEndSession?: () => void;
  onDeleteSession?: () => void;
}

export default function SessionControls({ onSessionStarted, onEndSession, onDeleteSession }: SessionControlsProps) {
  const currentSession = useSessionStore((s) => s.currentSession);
  const setCurrentSession = useSessionStore((s) => s.setCurrentSession);
  const addSession = useSessionStore((s) => s.addSession);

  const [sessionName, setSessionName] = useState('');
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sessionType, setSessionType] = useState<SessionType>('practice');
  const [matchType, setMatchType] = useState<MatchType>('league');
  const [customMatchType, setCustomMatchType] = useState('');

  const isMatch = sessionType === 'match';

  const startSession = useCallback(() => {
    if (currentSession) {
      if (!window.confirm('End current session and start a new one?')) return;
      if (currentSession.shots.length === 0) {
        setCurrentSession(null);
      } else {
        // Finalise existing session
        addSession({ ...currentSession, endTime: new Date().toISOString() });
        setCurrentSession(null);
      }
    }

    const name = sessionName || (isMatch ? 'Unnamed Match' : 'Unnamed Session');
    const mt = isMatch ? (matchType === 'custom' ? (customMatchType || 'Custom') : matchType) : null;

    const session: Session = {
      id: Date.now(),
      name,
      date: sessionDate,
      type: sessionType,
      sport: 'football',
      matchType: mt as MatchType,
      shots: [],
      startTime: new Date().toISOString(),
    };
    setCurrentSession(session);
    onSessionStarted?.();
  }, [currentSession, sessionName, sessionDate, sessionType, matchType, customMatchType, isMatch, setCurrentSession, addSession, onSessionStarted]);

  const endSession = useCallback(() => {
    if (!currentSession) return;
    if (currentSession.shots.length === 0) {
      setCurrentSession(null);
      return;
    }
    onEndSession?.();
  }, [currentSession, setCurrentSession, onEndSession]);

  // If session is active, show session banner
  if (currentSession) {
    const typeDisplay = currentSession.matchType
      ? `${currentSession.type} (${currentSession.matchType})`
      : currentSession.type;
    return (
      <div className="bg-primary text-white rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{currentSession.name}</div>
            <div className="text-xs opacity-80">
              {typeDisplay} · {currentSession.date} · {(currentSession.shots ?? []).length} shots
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={endSession}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors"
            >
              End Session
            </button>
            <button
              onClick={onDeleteSession}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/30 hover:bg-red-500/50 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Session start form
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
      {/* Practice/Match toggle */}
      <div className="flex gap-1 bg-grey-light rounded-lg p-1 max-w-xs">
        <button
          onClick={() => setSessionType('practice')}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-colors ${
            !isMatch ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
          }`}
        >
          Practice
        </button>
        <button
          onClick={() => setSessionType('match')}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-colors ${
            isMatch ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
          }`}
        >
          Match
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Session name / Opponent */}
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">
            {isMatch ? 'Opponent' : 'Session Name'}
          </label>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder={isMatch ? 'e.g., St. Patricks' : 'e.g., Training – Monday'}
            className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Date</label>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Match type (only for match mode) */}
      {isMatch && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-muted mb-1">Match Type</label>
            <select
              value={matchType ?? 'league'}
              onChange={(e) => setMatchType(e.target.value as MatchType)}
              className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="league">League</option>
              <option value="championship">Championship</option>
              <option value="friendly">Friendly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {matchType === 'custom' && (
            <div className="flex-1">
              <input
                type="text"
                value={customMatchType}
                onChange={(e) => setCustomMatchType(e.target.value)}
                placeholder="Custom type..."
                className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
              />
            </div>
          )}
        </div>
      )}

      <button
        onClick={startSession}
        className="w-full py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
      >
        Start Session
      </button>
    </div>
  );
}
