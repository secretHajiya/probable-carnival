import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminRoleAssignment = {
  user_id: string;
  role: "support" | "finance_reviewer" | "admin" | "super_admin";
  granted_by: string | null;
  granted_at: string;
  is_active: boolean;
};

export type AdminAuditEvent = {
  id: string;
  actor_user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
};

export async function listAdminRoleAssignments(
  supabase: SupabaseClient,
  limit = 50,
  offset = 0,
): Promise<AdminRoleAssignment[]> {
  const { data, error } = await supabase.rpc("admin_list_role_assignments", {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data ?? []) as AdminRoleAssignment[];
}

export async function listAdminAuditLogs(
  supabase: SupabaseClient,
  filters: {
    targetType?: string | null;
    actionPrefix?: string | null;
    limit?: number;
    offset?: number;
  } = {},
): Promise<AdminAuditEvent[]> {
  const { data, error } = await supabase.rpc("admin_list_audit_logs", {
    p_target_type: filters.targetType ?? null,
    p_action_prefix: filters.actionPrefix ?? null,
    p_limit: filters.limit ?? 50,
    p_offset: filters.offset ?? 0,
  });
  if (error) throw error;
  return (data ?? []) as AdminAuditEvent[];
}
