import { requireSupabase } from '../lib/supabase';

export type WalletLedgerEntry = {
  id: string;
  entry_type: string;
  amount_coins: number;
  description: string | null;
  created_at: string;
};

const PAGE_SIZE = 25;

export const activityService = {
  async listForMember(userId: string, page: number): Promise<WalletLedgerEntry[]> {
    if (!userId) throw new Error('Please sign in again to view your activity.');
    if (!Number.isInteger(page) || page < 0) throw new Error('Invalid activity page.');
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await requireSupabase()
      .from('wallet_ledger')
      .select('id,entry_type,amount_coins,description,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as WalletLedgerEntry[];
  },
};
