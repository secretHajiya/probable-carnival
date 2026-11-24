import type { AuthError } from '@supabase/supabase-js';
import { normalizeLocale, type MemberLocale } from '../i18n';
import { requireSupabase } from '../lib/supabase';
import type { MemberProfile } from './types';

const auth = () => requireSupabase().auth;
const friendly = (error: AuthError) => error.message;

export async function signUp(input: { displayName: string; email: string; password: string; language: MemberLocale }) {
  const name = input.displayName.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 2) throw new Error('Enter a name with at least 2 characters.');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.');
  if (input.password.length < 8) throw new Error('Password must contain at least 8 characters.');
  const { data, error } = await auth().signUp({
    email,
    password: input.password,
    options: { data: { display_name: name, preferred_language: normalizeLocale(input.language) } },
  });
  if (error) throw new Error(friendly(error));
  return { user: data.user, needsEmailConfirmation: Boolean(data.user && !data.session) };
}

export async function signIn(emailValue: string, password: string) {
  const { data, error } = await auth().signInWithPassword({ email: emailValue.trim().toLowerCase(), password });
  if (error) throw new Error(friendly(error));
  return data;
}

export async function requestPasswordReset(emailValue: string, redirectTo?: string) {
  const email = emailValue.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.');
  const { error } = await auth().resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
  if (error) throw new Error(friendly(error));
}

export async function updatePassword(password: string) {
  if (password.length < 8) throw new Error('Password must contain at least 8 characters.');
  const { error } = await auth().updateUser({ password });
  if (error) throw new Error(friendly(error));
}

export async function signOut() {
  const { error } = await auth().signOut();
  if (error) throw new Error(friendly(error));
}

export async function getMemberProfile(userId: string): Promise<MemberProfile> {
  const client = requireSupabase();
  const { data, error } = await client.from('profiles').select('id,display_name,country_code,preferred_language,status,referral_code,email_verified_at,created_at,updated_at').eq('id', userId).single();
  if (error) throw new Error(error.message);
  return { ...data, preferred_language: normalizeLocale(data.preferred_language) } as MemberProfile;
}

export async function setMemberCountry(countryCode: 'NG' | 'US') {
  const { error } = await requireSupabase().rpc('set_member_country', { p_country_code: countryCode });
  if (error) throw new Error(error.message);
}

export async function updateMemberProfile(userId: string, changes: { display_name?: string; preferred_language?: MemberLocale; country_code?: string | null }) {
  const allowed: Record<string, unknown> = {};
  if (changes.display_name !== undefined) allowed.display_name = changes.display_name.trim();
  if (changes.preferred_language !== undefined) allowed.preferred_language = normalizeLocale(changes.preferred_language);
  // Country selection is handled only by the set_member_country SECURITY DEFINER RPC.
  const { error } = await requireSupabase().from('profiles').update(allowed).eq('id', userId);
  if (error) throw new Error(error.message);
  return getMemberProfile(userId);
}
