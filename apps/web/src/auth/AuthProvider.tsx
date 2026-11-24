import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { requireSupabase } from '../lib/supabase';
import { getMemberProfile, signOut } from './authService';
import type { AuthState, MemberProfile } from './types';

const initial: AuthState = { user: null, session: null, profile: null, loading: true, profileError: null };
type AuthContextValue = AuthState & { refreshProfile: () => Promise<void>; logout: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initial);
  const loadProfile = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setState({ user: null, session: null, profile: null, loading: false, profileError: null });
      return;
    }
    setState(s => ({ ...s, user: session.user, session, loading: true, profileError: null }));
    try {
      const profile: MemberProfile = await getMemberProfile(session.user.id);
      setState({ user: session.user, session, profile, loading: false, profileError: null });
    } catch (error) {
      setState({ user: session.user, session, profile: null, loading: false, profileError: error instanceof Error ? error.message : 'Unable to load profile.' });
    }
  }, []);

  useEffect(() => {
    const client = requireSupabase();
    let alive = true;
    client.auth.getSession().then(({ data }) => { if (alive) void loadProfile(data.session); });
    const { data: listener } = client.auth.onAuthStateChange((_event: AuthChangeEvent, session) => {
      if (alive) queueMicrotask(() => { if (alive) void loadProfile(session); });
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!state.session?.user) return;
    const profile = await getMemberProfile(state.session.user.id);
    setState(s => ({ ...s, profile, profileError: null }));
  }, [state.session]);
  const logout = useCallback(async () => { await signOut(); }, []);
  const value = useMemo(() => ({ ...state, refreshProfile, logout }), [state, refreshProfile, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
