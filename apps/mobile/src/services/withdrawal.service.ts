import { requireSupabase } from '../lib/supabase';

export type MemberWithdrawal = {
  id: string;
  country_code: string;
  payout_method: string;
  amount_coins: number;
  amount_minor: number;
  currency_code: string;
  fee_minor: number;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
};

export type WithdrawalReadModel = {
  countryCode: string | null;
  currencyCode: string | null;
  minCoins: number | null;
  maxCoins: number | null;
  feeBps: number | null;
  configuredEnabled: boolean;
  items: MemberWithdrawal[];
};

/** Read-only member view. This service deliberately exposes no withdrawal-creation method. */
export const withdrawalService = {
  async getMemberOverview(expectedUserId: string): Promise<WithdrawalReadModel> {
    if (!expectedUserId) throw new Error('Please sign in again to view withdrawals.');
    const db = requireSupabase();
    const { data: auth, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    if (!auth.user || auth.user.id !== expectedUserId) {
      throw new Error('Your session is not valid for this withdrawal history. Please sign in again.');
    }

    const [profileResult, historyResult] = await Promise.all([
      db.from('profiles').select('country_code').eq('id', auth.user.id).maybeSingle(),
      db.from('withdrawal_requests')
        .select('id,country_code,payout_method,amount_coins,amount_minor,currency_code,fee_minor,status,requested_at,reviewed_at,rejection_reason')
        .eq('user_id', auth.user.id)
        .order('requested_at', { ascending: false })
        .limit(50),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (historyResult.error) throw historyResult.error;

    const countryCode = profileResult.data?.country_code?.trim() || null;
    if (!countryCode) {
      return { countryCode: null, currencyCode: null, minCoins: null, maxCoins: null, feeBps: null, configuredEnabled: false, items: (historyResult.data ?? []) as MemberWithdrawal[] };
    }

    // Member RLS intentionally reveals only enabled config rows (or finance-admin rows).
    // A missing row therefore stays safely unavailable; it is not treated as enabled.
    const { data: config, error: configError } = await db.from('withdrawal_config')
      .select('min_coins,max_coins,fee_bps,is_enabled')
      .eq('country_code', countryCode)
      .maybeSingle();
    if (configError) throw configError;

    return {
      countryCode,
      currencyCode: countryCode === 'NG' ? 'NGN' : countryCode === 'US' ? 'USD' : null,
      minCoins: config?.is_enabled ? Number(config.min_coins) : null,
      maxCoins: config?.is_enabled ? Number(config.max_coins) : null,
      feeBps: config?.is_enabled ? Number(config.fee_bps) : null,
      configuredEnabled: config?.is_enabled === true,
      items: (historyResult.data ?? []) as MemberWithdrawal[],
    };
  },
};
