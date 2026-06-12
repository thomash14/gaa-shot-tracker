import { createClient } from './client';
import type { PlayerEventType, PlayerMatchEvent } from '@/types';

/**
 * Offline-capable persistence for player_match_events.
 *
 * Mirrors the cloudWrite offline pattern: writes go straight to Supabase when
 * online; when offline (or on a transient error) they are queued in
 * localStorage and flushed on reconnect. Reads come from Supabase and are
 * merged with any still-pending local events by the caller.
 */

const LS_PENDING = 'kickon_pending_player_events';

export interface PlayerEventInput {
  localId: string;
  coachMatchId: string;
  playerId: string;
  eventType: PlayerEventType;
  x: number | null;
  y: number | null;
  outcome: string | null;
  assistType: string | null;
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

function loadPending(): PlayerEventInput[] {
  try {
    const raw = localStorage.getItem(LS_PENDING);
    return raw ? (JSON.parse(raw) as PlayerEventInput[]) : [];
  } catch {
    return [];
  }
}

function savePending(list: PlayerEventInput[]): void {
  try {
    localStorage.setItem(LS_PENDING, JSON.stringify(list));
  } catch {
    /* ignore quota errors */
  }
}

function addPending(e: PlayerEventInput): void {
  const list = loadPending();
  if (!list.some((p) => p.localId === e.localId)) {
    list.push(e);
    savePending(list);
  }
}

function removePending(localId: string): void {
  savePending(loadPending().filter((p) => p.localId !== localId));
}

function toRow(e: PlayerEventInput) {
  return {
    coach_match_id: e.coachMatchId,
    player_id: e.playerId,
    event_type: e.eventType,
    x_position: e.x,
    y_position: e.y,
    outcome: e.outcome,
    assist_type: e.assistType,
  };
}

/** Insert an event. Returns the cloud id when synced, or null when queued offline. */
export async function insertPlayerEvent(e: PlayerEventInput): Promise<string | null> {
  if (isOffline()) {
    addPending(e);
    return null;
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from('player_match_events')
    .insert(toRow(e))
    .select('id')
    .single();
  if (error || !data) {
    console.error('[playerEvents] insert error:', error);
    addPending(e);
    return null;
  }
  return data.id as string;
}

/** Delete an event. If only queued locally (no cloud id), just drop it from the queue. */
export async function deletePlayerEvent(localId: string, cloudId?: string): Promise<void> {
  removePending(localId);
  if (!cloudId) return;
  if (isOffline()) return;
  const supabase = createClient();
  const { error } = await supabase.from('player_match_events').delete().eq('id', cloudId);
  if (error) console.error('[playerEvents] delete error:', error);
}

/** Flush any queued events. Returns the number successfully synced. */
export async function flushPendingPlayerEvents(): Promise<number> {
  if (isOffline()) return 0;
  const pending = loadPending();
  if (pending.length === 0) return 0;
  const supabase = createClient();
  let flushed = 0;
  for (const e of pending) {
    const { error } = await supabase.from('player_match_events').insert(toRow(e));
    if (!error) {
      removePending(e.localId);
      flushed++;
    } else {
      console.error('[playerEvents] flush error:', error);
    }
  }
  return flushed;
}

export function pendingPlayerEventCount(): number {
  return loadPending().length;
}

/** Pending events for a specific match (used to merge into the UI after a reload). */
export function pendingPlayerEventsFor(coachMatchId: string, playerId: string): PlayerEventInput[] {
  return loadPending().filter((e) => e.coachMatchId === coachMatchId && e.playerId === playerId);
}

/** Load this player's stored events for a match. */
export async function loadPlayerEvents(
  coachMatchId: string,
  playerId: string,
): Promise<PlayerMatchEvent[]> {
  if (isOffline()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('player_match_events')
    .select('*')
    .eq('coach_match_id', coachMatchId)
    .eq('player_id', playerId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[playerEvents] load error:', error);
    return [];
  }
  return (data ?? []) as unknown as PlayerMatchEvent[];
}

/** Mark the player's review complete via the SECURITY DEFINER RPC. */
export async function submitPlayerReview(coachMatchId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('submit_player_review', {
    p_coach_match_id: coachMatchId,
  });
  if (error) throw error;
}
