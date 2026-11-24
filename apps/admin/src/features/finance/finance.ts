import type { SupabaseClient } from "@supabase/supabase-js";

export type FinanceOverview = {
  pending_withdrawals: number;
  approved_unpaid_withdrawals: number;
  paid_withdrawals: number;
  rejected_withdrawals: number;
  active_members: number;
  suspended_members: number;
  available_coins_total: number;
  pending_coins_total: number;
  lifetime_coins_total: number;
  generated_at: string;
};

export type AdminWithdrawal = {
  id: string;
  user_id: string;
  display_name: string | null;
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

export async function getFinanceOverview(
  supabase: SupabaseClient,
): Promise<FinanceOverview> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sign in required.");

  const { data, error } = await supabase.rpc("admin_get_finance_overview");
  if (error) throw error;
  return data as FinanceOverview;
}

export async function listAdminWithdrawals(
  supabase: SupabaseClient,
  status: string | null = null,
  limit = 25,
  offset = 0,
): Promise<AdminWithdrawal[]> {
  const { data, error } = await supabase.rpc("admin_list_withdrawals", {
    p_status: status,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data ?? []) as AdminWithdrawal[];
}

export async function reviewWithdrawal(
  supabase: SupabaseClient,
  withdrawalId: string,
  decision: "approved" | "rejected" | "needs_info",
  note = "",
): Promise<string> {
  const { data, error } = await supabase.rpc("admin_review_withdrawal_audited", {
    p_withdrawal_id: withdrawalId,
    p_decision: decision,
    p_note: note,
  });
  if (error) throw error;
  return String(data);
}
