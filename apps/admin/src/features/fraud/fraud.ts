import type { SupabaseClient } from '@supabase/supabase-js';

export type FraudStatus = 'pending' | 'reviewing' | 'cleared' | 'restricted';
export type FraudCase = { id:string; user_id:string; display_name:string|null; country_code:string|null; reason_code:string; risk_score:number; status:FraudStatus; reviewer_id:string|null; reviewer_note:string|null; created_at:string; reviewed_at:string|null };
export async function listFraudCases(client:SupabaseClient,status:FraudStatus|'all'='pending'):Promise<FraudCase[]> {
 const {data,error}=await client.rpc('admin_list_fraud_reviews',{p_status:status==='all'?null:status,p_limit:100,p_offset:0});
 if(error) throw error; return (data||[]) as FraudCase[];
}
export async function reviewFraudCase(client:SupabaseClient,id:string,decision:Exclude<FraudStatus,'pending'>,note:string):Promise<string>{
 const {data,error}=await client.rpc('admin_review_fraud_case',{p_review_id:id,p_decision:decision,p_note:note});
 if(error) throw error; return String(data);
}
