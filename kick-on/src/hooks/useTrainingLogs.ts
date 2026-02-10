'use client';

import { useState, useCallback } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import type { TrainingLog, TrainingSessionType } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrainingFormData {
  sessionType: TrainingSessionType;
  // Training-specific
  kickingBefore: boolean;
  kickingAfter: boolean;
  beforeDuration: number;
  afterDuration: number;
  // Gym-specific
  gymDuration: number;
  gymFocus: string;
  // Recovery-specific
  recoveryDuration: number;
  recoveryType: string;
  // Shared
  comments: string;
}

const DEFAULT_FORM: TrainingFormData = {
  sessionType: 'training',
  kickingBefore: false,
  kickingAfter: false,
  beforeDuration: 20,
  afterDuration: 20,
  gymDuration: 60,
  gymFocus: 'full-body',
  recoveryDuration: 30,
  recoveryType: 'ice-bath',
  comments: '',
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTrainingLogs() {
  const addTrainingLog = useSessionStore((s) => s.addTrainingLog);
  const removeTrainingLog = useSessionStore((s) => s.removeTrainingLog);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [form, setForm] = useState<TrainingFormData>({ ...DEFAULT_FORM });

  const openModal = useCallback((dateStr: string) => {
    setModalDate(dateStr);
    setForm({ ...DEFAULT_FORM });
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalDate(null);
  }, []);

  const updateForm = useCallback(<K extends keyof TrainingFormData>(
    field: K,
    value: TrainingFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const saveLog = useCallback(() => {
    if (!modalDate) return;

    const log: TrainingLog = {
      id: Date.now(),
      userId: '', // set by sync layer
      date: modalDate,
      sessionType: form.sessionType,
      comments: form.comments.trim() || undefined,
    };

    if (form.sessionType === 'training') {
      log.kickingBefore = form.kickingBefore;
      log.beforeDuration = form.kickingBefore ? form.beforeDuration : undefined;
      log.kickingAfter = form.kickingAfter;
      log.afterDuration = form.kickingAfter ? form.afterDuration : undefined;
    } else if (form.sessionType === 'gym') {
      log.gymDuration = form.gymDuration;
      log.gymFocus = form.gymFocus;
    } else if (form.sessionType === 'recovery') {
      log.recoveryDuration = form.recoveryDuration;
      log.recoveryType = form.recoveryType;
    }

    addTrainingLog(log);
    closeModal();
  }, [modalDate, form, addTrainingLog, closeModal]);

  const deleteLog = useCallback(
    (id: string | number) => {
      removeTrainingLog(id);
    },
    [removeTrainingLog],
  );

  return {
    // Modal state
    modalOpen,
    modalDate,
    form,
    // Modal actions
    openModal,
    closeModal,
    updateForm,
    saveLog,
    // CRUD
    deleteLog,
  };
}
