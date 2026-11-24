import { useCallback, useEffect, useState } from 'react';
import { requireSupabase } from '../lib/supabase';
import type { MemberProfile } from '../auth/types';
import './referrals.css';

type Referral = { id: string; status: 'pending' | 'qualified' | 'rewarded' | 'rejected'; created_at: string; qualified_at: string | null };

export function ReferralCenter({ profile, onBack }: { profile: MemberProfile | null; onBack: () => void }) {
  const [items, setItems] = useState<Referral[]>([]);
  const [code, setCode] = useState('');
  const [applyCode, setApplyCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const db = requireSupabase();
      const { data: auth, error: authError } = await db.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error('Your session has expired. Sign in again.');
      const [p, r] = await Promise.all([
        db.from('profiles').select('referral_code,referred_by').eq('id', auth.user.id).maybeSingle(),
        db.from('referrals').select('id,status,created_at,qualified_at').eq('referrer_user_id', auth.user.id).order('created_at', { ascending: false }).limit(100),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      setCode(p.data?.referral_code || profile?.referral_code || '');
      setItems((r.data || []) as Referral[]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load referrals.'); }
    finally { setLoading(false); }
  }, [profile?.referral_code]);
  useEffect(() => { void load(); }, [load]);
  const copy = async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setMessage('Referral code copied.'); }
    catch { setMessage(`Your referral code is ${code}. Copy it manually.`); }
  };
  const apply = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const { data, error: rpcError } = await requireSupabase().rpc('apply_referral_code', { p_code: applyCode.trim().toUpperCase() });
      if (rpcError) throw rpcError;
      if (!data?.ok) throw new Error(data?.reason || 'Referral code could not be applied.');
      setMessage('Referral code applied successfully. Qualification and any reward are verified by the server.');
      setApplyCode(''); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to apply referral code.'); }
    finally { setBusy(false); }
  };
  const count = (s: Referral['status']) => items.filter(x => x.status === s).length;
  const label = (s: Referral['status']) => ({ pending: 'Pending', qualified: 'Qualified', rewarded: 'Rewarded', rejected: 'Rejected' })[s];
  return <main className="vref">
    <header className="vref-head"><div><span className="vref-brand">VYRA REWARDS GLOBAL</span><h1>Referral Center</h1><p>Invite friends and track verified referral progress.</p></div><button onClick={onBack}>Back to dashboard</button></header>
    {error && <div className="vref-error" role="alert">{error}</div>}{message && <div className="vref-message" role="status">{message}</div>}
    <section className="vref-card vref-share"><div><span className="vref-kicker">YOUR INVITE CODE</span><strong>{loading ? 'Loading…' : code || 'Not assigned'}</strong><p>Share this code with someone who is new to Vyra Rewards Global.</p></div><button onClick={() => void copy()} disabled={!code || loading}>Copy code</button></section>
    <section className="vref-stats"><article><span>Total referrals</span><strong>{loading ? '—' : items.length}</strong></article><article><span>Pending</span><strong>{loading ? '—' : count('pending')}</strong></article><article><span>Qualified</span><strong>{loading ? '—' : count('qualified')}</strong></article><article><span>Rewarded</span><strong>{loading ? '—' : count('rewarded')}</strong></article></section>
    <section className="vref-card vref-apply"><h2>Have a referral code?</h2><p>Apply a code shared with you. Each account can apply only one referral code, and self-referrals are not allowed.</p><div><input value={applyCode} onChange={e => setApplyCode(e.target.value.toUpperCase())} maxLength={32} placeholder="Enter referral code" autoComplete="off" /><button onClick={() => void apply()} disabled={busy || applyCode.trim().length < 4}>{busy ? 'Applying…' : 'Apply code'}</button></div></section>
    <section className="vref-card"><div className="vref-list-title"><h2>Your invited members</h2><button onClick={() => void load()} disabled={loading}>Refresh</button></div>{loading ? <p>Loading referral activity…</p> : items.length === 0 ? <p className="vref-empty">No referrals yet. Share your code to get started.</p> : <ul>{items.map(x => <li key={x.id}><div><strong>Referral</strong><small>{new Date(x.created_at).toLocaleDateString()}</small></div><span className={`vref-status vref-${x.status}`}>{label(x.status)}</span></li>)}</ul>}</section>
    <p className="vref-note">Referral rewards are not promised or estimated here. The server checks eligibility and configured reward rules before crediting coins.</p>
  </main>;
}
