'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialising: boolean;
}

interface SignupData {
  email: string;
  password: string;
  name: string;
  dob?: string;
  county?: string;
  club?: string;
  primaryPosition?: string;
  secondaryPosition?: string;
  preferredFoot?: string;
  primarySport?: string;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: false,
    initialising: true,
  });

  const supabase = createClient();

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        initialising: false,
      }));
    });

    // Also do an immediate check
    supabase.auth.getUser().then(({ data: { user } }) => {
      setState((prev) => ({
        ...prev,
        user: user ?? null,
        initialising: false,
      }));
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const login = useCallback(
    async (email: string, password: string) => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [supabase.auth]
  );

  const signup = useCallback(
    async (data: SignupData) => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const { data: result, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              display_name: data.name,
              dob: data.dob || null,
              county: data.county || null,
              club: data.club || null,
              primary_position: data.primaryPosition || null,
              secondary_position: data.secondaryPosition || null,
              preferred_foot: data.preferredFoot || null,
              primary_sport: data.primarySport || 'football',
            },
          },
        });
        if (error) throw error;
        // If email confirmation required, user exists but session doesn't
        const needsConfirmation = !!(result.user && !result.session);
        return { needsConfirmation };
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [supabase.auth]
  );

  const loginWithGoogle = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (e) {
      setState((prev) => ({ ...prev, loading: false }));
      throw e;
    }
    // Don't set loading false — we're redirecting to Google
  }, [supabase.auth]);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [supabase.auth]);

  const isCoach = useCallback((): boolean => {
    if (!state.user) return false;
    return state.user.user_metadata?.primary_position === 'Coach/Manager';
  }, [state.user]);

  const displayName = state.user?.user_metadata?.display_name
    || state.user?.user_metadata?.name
    || state.user?.email
    || '';

  const initials = (() => {
    if (!displayName) return '?';
    const parts = displayName.split(' ').filter((p: string) => p.length > 0);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return '?';
  })();

  return {
    user: state.user,
    loading: state.loading,
    initialising: state.initialising,
    login,
    signup,
    loginWithGoogle,
    logout,
    isCoach,
    displayName,
    initials,
  };
}
