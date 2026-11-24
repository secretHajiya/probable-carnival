import type { Session, User } from '@supabase/supabase-js';
import type { MemberLocale } from '../i18n';

export interface MemberProfile {
  id: string;
  display_name: string | null;
  country_code: string | null;
  preferred_language: MemberLocale;
  status: 'active' | 'suspended' | 'closed';
  referral_code: string | null;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: MemberProfile | null;
  loading: boolean;
  profileError: string | null;
}
