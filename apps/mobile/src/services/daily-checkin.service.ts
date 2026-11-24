import { supabase } from '../lib/supabase';

export type DailyCheckin = {
  checkin_date: string;
  streak_day: number;
  reward_coins: number;
};

export type DailyCheckinClaim = {
  checkin_id: string;
  checkin_date: string;
  streak_day: number;
  reward_coins: number;
  available_coins: number;
};

function database() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function explain(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || 'Daily check-in failed.');
  if (raw.includes('already_checked_in_today')) return 'You have already claimed today’s reward. Please try again tomorrow.';
  if (raw.includes('daily_checkin_disabled')) return 'Daily Check-in is not enabled right now. Please check again later.';
  if (raw.includes('active_account_required')) return 'Your account must be active before claiming a reward.';
  if (raw.includes('authentication_required')) return 'Your session has expired. Please sign in again.';
  if (raw.includes('wallet_account_missing')) return 'Your wallet could not be found. Please contact support.';
  return raw;
}

export const dailyCheckinService = {
  async getHistory(limit = 30): Promise<DailyCheckin[]> {
    const db = database();
    const { data: auth, error: authError } = await db.auth.getUser();
    if (authError) throw new Error(explain(authError));
    if (!auth.user) throw new Error('authentication_required');
    const { data, error } = await db
      .from('daily_checkins')
      .select('checkin_date,streak_day,reward_coins')
      .eq('user_id', auth.user.id)
      .order('checkin_date', { ascending: false })
      .limit(limit);
    if (error) throw new Error(explain(error));
    return (data || []) as DailyCheckin[];
  },

  async claim(): Promise<DailyCheckinClaim> {
    const { data, error } = await database().rpc('claim_daily_checkin');
    if (error) throw new Error(explain(error));
    const row = (Array.isArray(data) ? data[0] : data) as DailyCheckinClaim | null;
    if (!row) throw new Error('Daily check-in service returned an empty response.');
    return row;
  },
};
