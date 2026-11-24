import { useCallback, useEffect, useState } from 'react';
import { requireSupabase } from '../lib/supabase';
import './checkin.css';

type Checkin = { checkin_date: string; streak_day: number; reward_coins: number };
type ClaimResult = { checkin_id: string; checkin_date: string; streak_day: number; reward_coins: number; available_coins: number };

function messageFor(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || 'Unable to complete check-in.');
  if (raw.includes('already_checked_in_today')) return 'You have already claimed today’s check-in reward.';
  if (raw.includes('daily_checkin_disabled')) return 'Daily check-in is not enabled yet. Please check again later.';
  if (raw.includes('active_account_required')) return 'Your account must be active to claim a check-in reward.';
  if (raw.includes('authentication_required')) return 'Your session has expired. Please sign in again.';
  return raw;
}

export function DailyCheckin({ onBack }: { onBack: () => void }) {
  const [history, setHistory] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [claim, setClaim] = useState<ClaimResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const db = requireSupabase();
      const { data: auth, error: authError } = await db.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error('Your session has expired. Please sign in again.');
      const { data, error: queryError } = await db.from('daily_checkins')
        .select('checkin_date,streak_day,reward_coins')
        .eq('user_id', auth.user.id)
        .order('checkin_date', { ascending: false }).limit(30);
      if (queryError) throw queryError;
      setHistory((data || []) as Checkin[]);
    } catch (cause) { setError(messageFor(cause)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const doClaim = async () => {
    setClaiming(true); setError(''); setNotice(''); setClaim(null);
    try {
      const { data, error: rpcError } = await requireSupabase().rpc('claim_daily_checkin');
      if (rpcError) throw rpcError;
      const row = (Array.isArray(data) ? data[0] : data) as ClaimResult | null;
      if (!row) throw new Error('The check-in service returned an empty response.');
      setClaim(row);
      setNotice(`Success! ${new Intl.NumberFormat().format(row.reward_coins)} coins credited. Your available balance is ${new Intl.NumberFormat().format(row.available_coins)} coins.`);
      await load();
    } catch (cause) { setError(messageFor(cause)); }
    finally { setClaiming(false); }
  };

  const latest = history[0];
  return <main className="vcheck">
    <header className="vcheck-head"><div><span className="vcheck-brand">VYRA REWARDS GLOBAL</span><h1>Daily Check-in</h1><p>Claim your configured daily reward and build a consistent streak.</p></div><button onClick={onBack}>Back to dashboard</button></header>
    {error && <div className="vcheck-alert" role="alert">{error}</div>}
    {notice && <div className="vcheck-success" role="status">{notice}</div>}
    <section className="vcheck-hero"><div className="vcheck-icon" aria-hidden="true">🔥</div><div><span className="vcheck-kicker">CURRENT STREAK</span><strong>{loading ? '—' : `${latest?.streak_day || 0} ${latest?.streak_day === 1 ? 'day' : 'days'}`}</strong><p>{latest ? `Last recorded check-in: ${latest.checkin_date}` : 'Your first check-in starts your streak.'}</p></div><button className="vcheck-claim" onClick={() => void doClaim()} disabled={claiming || loading}>{claiming ? 'Claiming…' : 'Claim daily reward'}</button></section>
    {claim && <section className="vcheck-result"><span>Today’s reward</span><strong>+{new Intl.NumberFormat().format(claim.reward_coins)} coins</strong><small>Streak day {claim.streak_day} · {claim.checkin_date}</small></section>}
    <section className="vcheck-history"><div className="vcheck-title"><h2>Check-in history</h2><button onClick={() => void load()} disabled={loading}>Refresh</button></div>
      {loading ? <p>Loading your check-in history…</p> : history.length === 0 ? <p className="vcheck-empty">No check-ins recorded yet. Use the claim button when daily rewards are enabled.</p> : <ul>{history.map((item) => <li key={item.checkin_date}><div><strong>{new Date(`${item.checkin_date}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong><small>Streak day {item.streak_day}</small></div><b>+{new Intl.NumberFormat().format(item.reward_coins)} coins</b></li>)}</ul>}
    </section>
    <p className="vcheck-note">The server decides eligibility, the daily reward amount, timezone and streak. Coins are credited only by the secure database function; this page never edits your wallet directly.</p>
  </main>;
}
