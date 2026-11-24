import { useCallback, useEffect, useState } from 'react';
import { requireSupabase } from '../lib/supabase';
import type { MemberProfile } from '../auth/types';
import './dashboard.css';
import { SpinWheel } from './SpinWheel';
import { QuizRewards } from './QuizRewards';

type Wallet = { available_coins: number; pending_coins: number; lifetime_earned_coins: number };
const COUNTRY_CURRENCY = { NG: { code: 'NGN', locale: 'en-NG' }, US: { code: 'USD', locale: 'en-US' } } as const;
type Ledger = { id: string; entry_type: string; amount_coins: number; description: string | null; created_at: string };
type DashboardProps = { profile: MemberProfile | null; email?: string; onSignOut: () => void; onEarn: () => void; onWithdrawals: () => void; onReferrals: () => void; onCheckin: () => void; onSupport: () => void };

export function Dashboard({ profile, email, onSignOut, onEarn, onWithdrawals, onReferrals, onCheckin, onSupport }: DashboardProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [activity, setActivity] = useState<Ledger[]>([]);
  const [withdrawals, setWithdrawals] = useState(0);
  const [referrals, setReferrals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [coinsPerMajorUnit, setCoinsPerMajorUnit] = useState<number | null>(null);
  const countryCode = profile?.country_code?.trim().toUpperCase() === 'US' ? 'US' : 'NG';
  const currency = COUNTRY_CURRENCY[countryCode];

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const db = requireSupabase();
      const { data: authData, error: authError } = await db.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      if (!user) {
        setError('Your session has expired. Please sign in again.');
        setWallet(null); setActivity([]); setWithdrawals(0); setReferrals(0);
        return;
      }
      const [w, l, wd, rf, rates] = await Promise.all([
        db.from('wallet_accounts').select('available_coins,pending_coins,lifetime_earned_coins').eq('user_id', user.id).maybeSingle(),
        db.from('wallet_ledger').select('id,entry_type,amount_coins,description,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
        db.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        db.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_user_id', user.id).eq('status', 'rewarded'),
        db.from('exchange_rates').select('coins_per_major_unit,effective_from,effective_to').eq('country_code', countryCode).eq('currency_code', currency.code).lte('effective_from', new Date().toISOString()).order('effective_from', { ascending: false }).limit(10),
      ]);
      const failed = [w.error, l.error, wd.error, rf.error, rates.error].find(Boolean);
      if (failed) throw failed;
      setWallet(w.data as Wallet | null);
      setActivity((l.data ?? []) as Ledger[]);
      setWithdrawals(wd.count ?? 0);
      setReferrals(rf.count ?? 0);
      const now = Date.now();
      const activeRate = (rates.data ?? []).find(rate => !rate.effective_to || new Date(rate.effective_to).getTime() > now);
      setCoinsPerMajorUnit(activeRate ? Number(activeRate.coins_per_major_unit) : null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your rewards account. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [countryCode, currency.code]);

  useEffect(() => { void load(); }, [load, refresh]);
  const coins = (n: number) => new Intl.NumberFormat().format(n || 0);
  const activitySign = (type: string) => {
    if (['reward_reversed', 'withdrawal_reserved', 'withdrawal_paid'].includes(type)) return '−';
    if (['reward_pending', 'reward_confirmed', 'withdrawal_released', 'referral_reward', 'bonus'].includes(type)) return '+';
    return '';
  };
  return <div className="vyra-dashboard">
    <header className="vd-header"><div><span className="vd-brand">VYRA REWARDS GLOBAL</span><p>Member dashboard · {countryCode} · {currency.code}</p></div><button className="vd-logout" onClick={onSignOut}>Sign out</button></header>
    <main className="vd-main">
      <section className="vd-welcome"><div><p className="vd-muted">YOUR ACCOUNT</p><h1>Hello, {profile?.display_name || email || 'Member'}</h1><p>Here is your rewards account summary.</p></div><div className="vd-actions"><button className="vd-earn" onClick={onEarn}>Earn coins</button><button className="vd-refresh" onClick={onWithdrawals}>Withdrawals</button><button className="vd-refresh" onClick={onReferrals}>Referrals</button><button className="vd-refresh" onClick={onCheckin}>Daily check-in</button><button className="vd-refresh" onClick={onSupport}>Notifications & Support</button><button className="vd-refresh" onClick={() => setRefresh(v => v + 1)}>Refresh</button></div></section>
      {error && <div className="vd-error" role="alert">{error}</div>}
      <section className="vd-stats" aria-label="Wallet summary">
        <article className="vd-stat vd-primary"><span>Available coins · {countryCode === 'NG' ? '₦' : '$'} account</span><strong>{loading ? '—' : coins(wallet?.available_coins ?? 0)}</strong><small>{coinsPerMajorUnit && wallet ? `≈ ${new Intl.NumberFormat(currency.locale, { style: 'currency', currency: currency.code }).format(wallet.available_coins / coinsPerMajorUnit)}` : 'Currency conversion rate not configured'}</small></article>
        <article className="vd-stat"><span>Pending coins</span><strong>{loading ? '—' : coins(wallet?.pending_coins ?? 0)}</strong><small>Awaiting confirmation</small></article>
        <article className="vd-stat"><span>Lifetime earned</span><strong>{loading ? '—' : coins(wallet?.lifetime_earned_coins ?? 0)}</strong><small>Total credited rewards</small></article>
        <article className="vd-stat"><span>Withdrawals</span><strong>{loading ? '—' : coins(withdrawals)}</strong><small>Requests submitted</small></article>
      </section>
      <SpinWheel onReward={() => setRefresh(v => v + 1)} />
      <QuizRewards onReward={() => setRefresh(v => v + 1)} />
      <section className="vd-panels"><article className="vd-panel"><div className="vd-panel-title"><h2>Recent activity</h2><span>Latest 6 entries</span></div>{loading ? <p className="vd-muted">Loading activity…</p> : activity.length === 0 ? <p className="vd-empty">No wallet activity yet. Completed eligible rewards will appear here.</p> : <ul className="vd-activity">{activity.map(item => <li key={item.id}><div><b>{item.description || item.entry_type.replaceAll('_', ' ')}</b><small>{new Date(item.created_at).toLocaleString()}</small></div><strong>{activitySign(item.entry_type)}{coins(item.amount_coins)} coins</strong></li>)}</ul>}</article>
      <article className="vd-panel vd-profile"><h2>Account details</h2><dl><dt>Email</dt><dd>{email || '—'}</dd><dt>Country</dt><dd>{countryCode === 'NG' ? 'Nigeria' : 'United States'}</dd><dt>Currency</dt><dd>{currency.code} ({countryCode === 'NG' ? '₦' : '$'})</dd><dt>Language</dt><dd>{profile?.preferred_language || 'English'}</dd><dt>Referral code</dt><dd>{profile?.referral_code || 'Not assigned'}</dd><dt>Rewarded referrals</dt><dd>{loading ? '—' : referrals}</dd></dl><p className="vd-note">Your coin balance is shared across countries. Currency estimates appear only when an approved exchange rate is configured; withdrawals remain separately controlled.</p></article></section>
    </main><footer className="vd-footer">Vyra Rewards Global · Account overview</footer>
  </div>;
}
