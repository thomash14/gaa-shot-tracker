'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Position } from '@/types';

/**
 * Lightweight pointer-events drag system shared by the formation steps.
 *
 * Works with both mouse and touch (pointer events) — no external dependency.
 * A drag only "arms" once the pointer moves past a small threshold, so a plain
 * tap still fires the element's onClick (used for tap-to-select-then-tap-slot
 * as an accessible fallback to dragging).
 *
 * Droppable targets are any DOM node carrying a `data-droppable-id` attribute;
 * the target under the pointer is resolved with document.elementFromPoint.
 */

export interface DragItem {
  playerId: string;
  name: string;
  /** Where the drag started — the bench or an occupied position slot. */
  source: 'bench' | 'slot';
  /** Set when source === 'slot'. */
  position?: Position;
}

interface DragContextValue {
  dragging: DragItem | null;
  overId: string | null;
  startDrag: (item: DragItem, e: React.PointerEvent) => void;
}

const DragContext = createContext<DragContextValue | null>(null);

export function useDrag(): DragContextValue {
  const ctx = useContext(DragContext);
  if (!ctx) throw new Error('useDrag must be used within a DragProvider');
  return ctx;
}

const THRESHOLD = 6;

interface DragProviderProps {
  /** Fired on drop with the dragged item and the droppable id under the pointer (or null). */
  onDrop: (item: DragItem, targetId: string | null) => void;
  children: ReactNode;
}

function findDroppable(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y);
  const d = el?.closest('[data-droppable-id]');
  return d?.getAttribute('data-droppable-id') ?? null;
}

export default function DragProvider({ onDrop, children }: DragProviderProps) {
  const dragRef = useRef<{
    item: DragItem;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);
  const onDropRef = useRef(onDrop);

  const [dragging, setDragging] = useState<DragItem | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [overId, setOverId] = useState<string | null>(null);

  // Keep the latest onDrop reachable from the mount-time listeners.
  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);

  // Attach global pointer listeners once. They no-op until a drag is armed.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const st = dragRef.current;
      if (!st) return;
      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;
      if (!st.active) {
        if (Math.hypot(dx, dy) < THRESHOLD) return;
        st.active = true;
        setDragging(st.item);
      }
      e.preventDefault();
      setPos({ x: e.clientX, y: e.clientY });
      setOverId(findDroppable(e.clientX, e.clientY));
    };

    const onUp = (e: PointerEvent) => {
      const st = dragRef.current;
      if (st?.active) {
        onDropRef.current(st.item, findDroppable(e.clientX, e.clientY));
      }
      dragRef.current = null;
      setDragging(null);
      setOverId(null);
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const startDrag = useCallback((item: DragItem, e: React.PointerEvent) => {
    dragRef.current = { item, startX: e.clientX, startY: e.clientY, active: false };
    setPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <DragContext.Provider value={{ dragging, overId, startDrag }}>
      {children}
      {dragging && (
        <div
          className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-lg opacity-90"
          style={{ left: pos.x, top: pos.y }}
        >
          {dragging.name}
        </div>
      )}
    </DragContext.Provider>
  );
}
