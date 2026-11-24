export type SupportedCountry = 'NG' | 'US';

export interface MemberProfile {
  id: string;
  display_name: string | null;
  country_code: string | null;
  status: string;
  preferred_language: string | null;
}

export interface WalletAccount {
  available_coins: number;
  pending_coins: number;
  lifetime_earned_coins: number;
}

export interface MemberSnapshot {
  profile: MemberProfile;
  wallet: WalletAccount | null;
}
