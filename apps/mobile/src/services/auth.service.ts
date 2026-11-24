import type { Session } from '@supabase/supabase-js';
import { requireSupabase } from '../lib/supabase';

const normalizedEmail = (email: string) => email.trim().toLowerCase();

export const authService = {
  async register(displayName: string, email: string, password: string) {
    const { data, error } = await requireSupabase().auth.signUp({
      email: normalizedEmail(email),
      password,
      options: { data: { display_name: displayName.trim() } },
    });
    if (error) throw error;
    return data.session;
  },

  async verifySignupOtp(email: string, token: string): Promise<Session | null> {
    const { data, error } = await requireSupabase().auth.verifyOtp({
      email: normalizedEmail(email),
      token: token.trim(),
      type: 'signup',
    });
    if (error) throw error;
    return data.session;
  },

  async signIn(email: string, password: string): Promise<Session | null> {
    const { data, error } = await requireSupabase().auth.signInWithPassword({
      email: normalizedEmail(email), password,
    });
    if (error) throw error;
    return data.session;
  },

  async signOut() {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw error;
  },
};
