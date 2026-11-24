import { requireSupabase } from '../lib/supabase';
import type { MemberProfile } from '../types/domain';

export const MEMBER_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'de', label: 'Deutsch' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'zh', label: '中文' },
] as const;

export type MemberLanguage = (typeof MEMBER_LANGUAGES)[number]['code'];

export const profileSettingsService = {
  async update(input: { displayName: string; language: MemberLanguage }): Promise<MemberProfile> {
    const displayName = input.displayName.trim();
    if (displayName.length < 2 || displayName.length > 80) {
      throw new Error('Name must contain between 2 and 80 characters.');
    }
    if (!MEMBER_LANGUAGES.some((item) => item.code === input.language)) {
      throw new Error('Choose a supported language.');
    }

    const client = requireSupabase();
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError) throw authError;
    const user = authData.user;
    if (!user) throw new Error('Your session has expired. Please sign in again.');

    // Only the authenticated user's editable profile fields are sent. Country is
    // deliberately excluded; it is selected once through set_member_country().
    const { error } = await client
      .from('profiles')
      .update({ display_name: displayName, preferred_language: input.language })
      .eq('id', user.id);
    if (error) throw error;

    const { data, error: readError } = await client
      .from('profiles')
      .select('id,display_name,country_code,status,preferred_language')
      .eq('id', user.id)
      .single();
    if (readError) throw readError;
    return data as MemberProfile;
  },
};
