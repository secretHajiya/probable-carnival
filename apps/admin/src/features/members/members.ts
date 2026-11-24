import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminMember = {
  member_id: string;
  display_name: string | null;
  country_code: string | null;
  account_status: "active" | "suspended" | "closed" | string;
  joined_at: string;
};

/** Read-only directory. The database RPC is the authorization boundary. */
export async function listAdminMembers(
  supabase: SupabaseClient,
  options: { search?: string; status?: "active" | "suspended" | "closed" | null; countryCode?: string | null; limit?: number; offset?: number } = {},
): Promise<AdminMember[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sign in required.");
  const { data, error } = await supabase.rpc("admin_list_members", {
    p_search: options.search?.trim() || null,
    p_status: options.status ?? null,
    p_country_code: options.countryCode?.trim().toUpperCase() || null,
    p_limit: options.limit ?? 25,
    p_offset: options.offset ?? 0,
  });
  if (error) throw error;
  return (data ?? []) as AdminMember[];
}
