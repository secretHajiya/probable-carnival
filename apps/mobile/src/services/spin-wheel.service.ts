import { requireSupabase } from '../lib/supabase';

export type SpinSegment = {
  key: string;
  label: string;
  coins: number;
  weight: number;
  active: boolean;
};

export type SpinResult = {
  spin_id: string;
  reward_key: string;
  reward_label: string;
  reward_coins: number;
  spins_remaining: number;
  available_coins: number;
};

export type SpinHistoryItem = {
  id: string;
  reward_label: string;
  reward_coins: number;
  created_at: string;
};

export type SpinWheelSnapshot = {
  enabled: boolean;
  dailyFreeSpins: number;
  segments: SpinSegment[];
  history: SpinHistoryItem[];
};

export const spinWheelService = {
  async getSnapshot(): Promise<SpinWheelSnapshot> {
    const client = requireSupabase();
    // Member RLS intentionally hides disabled configuration. No row means unavailable.
    const [{ data: config, error: configError }, { data: history, error: historyError }] = await Promise.all([
      client.from('spin_wheel_config').select('is_enabled,daily_free_spins,segments').eq('id', true).maybeSingle(),
      client.from('spin_wheel_spins').select('id,reward_label,reward_coins,created_at').order('created_at', { ascending: false }).limit(10),
    ]);
    if (configError) throw configError;
    if (historyError) throw historyError;
    if (!config || config.is_enabled !== true) {
      return { enabled: false, dailyFreeSpins: 1, segments: [], history: (history ?? []) as SpinHistoryItem[] };
    }
    const segments = Array.isArray(config.segments) ? config.segments as SpinSegment[] : [];
    return {
      enabled: true,
      dailyFreeSpins: Number(config.daily_free_spins ?? 1),
      segments: segments.filter(s => s && s.active === true && Number(s.weight) > 0),
      history: (history ?? []) as SpinHistoryItem[],
    };
  },

  async spin(): Promise<SpinResult> {
    const { data, error } = await requireSupabase().rpc('spin_wheel');
    if (error) throw new Error(error.message || 'Spin & Win is unavailable.');
    const result = Array.isArray(data) ? data[0] : data;
    if (!result || typeof result.spin_id !== 'string') throw new Error('The server returned an invalid spin result.');
    return result as SpinResult;
  },
};
