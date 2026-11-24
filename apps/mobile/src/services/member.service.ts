import { requireSupabase } from '../lib/supabase';
import type { MemberProfile, MemberSnapshot, SupportedCountry, WalletAccount } from '../types/domain';

const PROFILE_FIELDS = 'id,display_name,country_code,status,preferred_language';
const WALLET_FIELDS = 'available_coins,pending_coins,lifetime_earned_coins';

export const memberService = {
  async getProfile(userId: string): Promise<MemberProfile> {
    const { data, error } = await requireSupabase()
      .from('profiles').select(PROFILE_FIELDS).eq('id', userId).single();
    if (error) throw error;
    return data as MemberProfile;
  },

  async getWallet(userId: string): Promise<WalletAccount | null> {
    const { data, error } = await requireSupabase()
      .from('wallet_accounts').select(WALLET_FIELDS).eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data as WalletAccount | null;
  },

  async getSnapshot(userId: string): Promise<MemberSnapshot> {
    const profile = await this.getProfile(userId);
    const wallet = await this.getWallet(userId);
    return { profile, wallet };
  },

  async setCountry(countryCode: SupportedCountry): Promise<MemberProfile> {
    const { error } = await requireSupabase().rpc('set_member_country', {
      p_country_code: countryCode,
    });
    if (error) throw error;
    const { data: authData, error: authError } = await requireSupabase().auth.getUser();
    if (authError) throw authError;
    if (!authData.user) throw new Error('Your session has expired. Please sign in again.');
    return this.getProfile(authData.user.id);
  },
};
