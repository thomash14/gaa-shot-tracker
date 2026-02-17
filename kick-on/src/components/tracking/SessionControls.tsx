'use client';

import { useState, useCallback } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { defaultMatchTypeOptions, DEFAULT_MATCH_TYPE_VALUES } from '@/lib/filterOptions';
import { saveCustomCompetition, deleteCustomCompetition } from '@/lib/supabase/cloudWrite';
import type { SessionType, Session } from '@/types';

const CUSTOM_SENTINEL = '__custom__';

interface SessionControlsProps {
  /** Session type driven by the URL query param (?type=practice|match). */
  sessionType?: SessionType;
  onSessionStarted?: () => void;
  onEndSession?: () => void;
  onDeleteSession?: () => void;
}

export default function SessionControls({ sessionType: sessionTypeProp = 'practice', onSessionStarted, onEndSession, onDeleteSession }: SessionControlsProps) {
  const currentSession = useSessionStore((s) => s.currentSession);
  const setCurrentSession = useSessionStore((s) => s.setCurrentSession);
  const addSession = useSessionStore((s) => s.addSession);
  const customCompetitions = useSessionStore((s) => s.customCompetitions);
  const addCustomCompetition = useSessionStore((s) => s.addCustomCompetition);
  const removeCustomCompetition = useSessionStore((s) => s.removeCustomCompetition);

  const [sessionName, setSessionName] = useState('');
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [matchType, setMatchType] = useState('league');
  const [customMatchType, setCustomMatchType] = useState('');

  const sessionType = sessionTypeProp;
  const isMatch = sessionType === 'match';

  const isCustomEntry = matchType === CUSTOM_SENTINEL;
  const isSavedCustom = !isCustomEntry && !DEFAULT_MATCH_TYPE_VALUES.has(matchType);

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
    let mt: string | null = null;
    if (isMatch) {
      if (isCustomEntry) {
        mt = customMatchType.trim() || 'Custom';
      } else {
        mt = matchType;
      }
    }

    // Auto-save new custom types
    if (isMatch && isCustomEntry && mt && !DEFAULT_MATCH_TYPE_VALUES.has(mt)) {
      const alreadySaved = customCompetitions.some(
        (c) => c.toLowerCase() === mt!.toLowerCase(),
      );
      if (!alreadySaved) {
        addCustomCompetition(mt);
        saveCustomCompetition(mt);
      }
    }

    const session: Session = {
      id: Date.now(),
      name,
      date: sessionDate,
      type: sessionType,
      sport: 'football',
      matchType: mt,
      shots: [],
      startTime: new Date().toISOString(),
    };
    setCurrentSession(session);
    setCustomMatchType('');
    onSessionStarted?.();
  }, [currentSession, sessionName, sessionDate, sessionType, matchType, customMatchType, isMatch, isCustomEntry, customCompetitions, setCurrentSession, addSession, addCustomCompetition, onSessionStarted]);

  const endSession = useCallback(() => {
    if (!currentSession) return;
    if (currentSession.shots.length === 0) {
      setCurrentSession(null);
      return;
    }
    onEndSession?.();
  }, [currentSession, setCurrentSession, onEndSession]);

  const handleRemoveSavedType = useCallback(() => {
    removeCustomCompetition(matchType);
    deleteCustomCompetition(matchType);
    setMatchType('league');
  }, [matchType, removeCustomCompetition]);

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

  const defaultOptions = defaultMatchTypeOptions();

  // Session start form
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
      <h3 className="text-sm font-bold text-text">
        {isMatch ? 'New Match' : 'New Practice Session'}
      </h3>

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
        <div className="space-y-2">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-text-muted mb-1">Competition</label>
              <select
                value={matchType}
                onChange={(e) => {
                  setMatchType(e.target.value);
                  setCustomMatchType('');
                }}
                className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
              >
                {defaultOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
                {customCompetitions.length > 0 && (
                  <optgroup label="Saved">
                    {customCompetitions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                )}
                <option value={CUSTOM_SENTINEL}>Custom...</option>
              </select>
            </div>
            {isCustomEntry && (
              <div className="flex-1">
                <input
                  type="text"
                  value={customMatchType}
                  onChange={(e) => setCustomMatchType(e.target.value)}
                  placeholder="e.g., North Kerry League"
                  className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
            )}
          </div>
          {isSavedCustom && (
            <button
              type="button"
              onClick={handleRemoveSavedType}
              className="text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              Remove &ldquo;{matchType}&rdquo; from saved types
            </button>
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
