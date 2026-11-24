import type { SupabaseClient } from '@supabase/supabase-js';

export type ExchangeRateDraft = {
  id: string;
  country_code: string;
  country_name: string;
  currency_code: string;
  coins_per_major_unit: number;
  rationale: string;
  status: 'pending' | 'activated';
  approved_by?: string | null;
  approved_at?: string | null;
  activated_by?: string | null;
  activated_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ExchangeRateDraftSnapshot = {
  drafts: ExchangeRateDraft[];
  countries: Array<{ country_code: string; country_name: string; default_currency_code: string; is_enabled: boolean }>;
};

async function call<T>(client: SupabaseClient, name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await client.rpc(name, args ?? {});
  if (error) throw new Error(error.message);
  return data as T;
}

export const getExchangeRateDrafts = (client: SupabaseClient) =>
  call<ExchangeRateDraftSnapshot>(client, 'admin_list_exchange_rate_drafts');

export const saveExchangeRateDraft = (
  client: SupabaseClient,
  value: { country_code: string; currency_code: string; coins_per_major_unit: number; rationale: string },
) => call<null>(client, 'admin_save_exchange_rate_draft', {
  p_country_code: value.country_code.trim().toUpperCase(),
  p_currency_code: value.currency_code.trim().toUpperCase(),
  p_coins_per_major_unit: value.coins_per_major_unit,
  p_rationale: value.rationale.trim(),
});

export const activateExchangeRateDraft = (client: SupabaseClient, draftId: string) =>
  call<{ status: 'activated'; draft_id: string; live_exchange_rate_id: string; country_code: string; currency_code: string; coins_per_major_unit: number; effective_from: string }>(
    client, 'admin_activate_exchange_rate_draft', { p_draft_id: draftId },
  );
