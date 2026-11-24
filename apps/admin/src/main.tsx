import React from 'react';
import { createRoot } from 'react-dom/client';
import type { Session } from '@supabase/supabase-js';
import { configured, requireSupabase } from './lib/supabase';
import { getFinanceOverview, listAdminWithdrawals, reviewWithdrawal, type FinanceOverview, type AdminWithdrawal } from './features/finance/finance';
import { AdminSupportInbox } from './features/support/AdminSupportInbox';
import { AdminMemberDirectory } from './features/members/AdminMemberDirectory';
import { AdminSecurityCenter } from './features/security/AdminSecurityCenter';
import { AdminFraudReview } from './features/fraud/AdminFraudReview';
import { AdminRewardConfiguration } from './features/rewards/AdminRewardConfiguration';
import { AdminSpinWheel } from './features/rewards/AdminSpinWheel';
import { AdminQuizRewards } from './features/rewards/AdminQuizRewards';
import { AdminLevelPlay } from './features/rewards/AdminLevelPlay';
import { AdminCountryCurrency } from './features/settings/AdminCountryCurrency';
import { AdminExchangeRates } from './features/settings/AdminExchangeRates';
import { AdminRewardProviders } from './features/providers/AdminRewardProviders';
import { AdminPaypalReconciliation } from './features/finance/AdminPaypalReconciliation';
import './style.css';

function isFinanceAuthorizationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
  const code = String(value.code ?? '');
  const message = [value.message, value.details, value.hint].map(v => String(v ?? '')).join(' ');
  return code === '42501' || code === 'PGRST301' ||
    /finance_admin_required|permission denied|not authorized|insufficient privilege/i.test(message);
}

function App() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [activeView, setActiveView] = React.useState<'finance' | 'support' | 'members' | 'security' | 'fraud' | 'rewards' | 'countries' | 'exchangeRates' | 'providers' | 'spin' | 'quiz' | 'levelplay' | 'paypalReconciliation'>('finance');
  const [ready, setReady] = React.useState(false);
  const [adminGate, setAdminGate] = React.useState<'checking' | 'allowed' | 'denied'>('checking');
  const [capabilities, setCapabilities] = React.useState<{ finance: boolean; configuration: boolean } | null>(null);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [overview, setOverview] = React.useState<FinanceOverview | null>(null);
  const [rows, setRows] = React.useState<AdminWithdrawal[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [filter, setFilter] = React.useState('');
  const [accessDenied, setAccessDenied] = React.useState(false);
  const [notes, setNotes] = React.useState<Record<string,string>>({});
  const [payoutDetails, setPayoutDetails] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    const clearSensitive = () => setPayoutDetails({});
    const onVisibility = () => { if (document.visibilityState !== 'visible') clearSensitive(); };
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setTimeout(clearSensitive, 30_000);
    return () => { document.removeEventListener('visibilitychange', onVisibility); window.clearTimeout(timer); };
  }, [payoutDetails]);
  const [payoutBusy, setPayoutBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!configured) { setReady(true); return; }
    const client = requireSupabase();
    let alive = true;
    client.auth.getSession().then(({data}) => { if (alive) { setSession(data.session); setReady(true); } });
    const { data: listener } = client.auth.onAuthStateChange((_event, next) => { if (alive) setSession(next); });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  // A valid Supabase session is not sufficient for Admin Dashboard access.
  // The database role helper is the authority; fail closed on RPC errors.
  React.useEffect(() => {
    let alive = true;
    if (!session) { setAdminGate('checking'); return () => { alive = false; }; }
    setAdminGate('checking');
    requireSupabase().rpc('is_active_admin').then(({ data, error }) => {
      if (!alive) return;
      setAdminGate(!error && data === true ? 'allowed' : 'denied');
    }).catch(() => { if (alive) setAdminGate('denied'); });
    return () => { alive = false; };
  }, [session]);

  // Resolve least-privilege navigation from existing database role helpers.
  // These flags only control UI visibility; every RPC continues enforcing its own server-side role check.
  React.useEffect(() => {
    let alive = true;
    if (!session || adminGate !== 'allowed') { setCapabilities(null); return () => { alive = false; }; }
    setCapabilities(null);
    Promise.all([
      requireSupabase().rpc('is_finance_admin'),
      requireSupabase().rpc('is_configuration_admin'),
    ]).then(([finance, configuration]) => {
      if (!alive) return;
      setCapabilities({
        finance: !finance.error && finance.data === true,
        configuration: !configuration.error && configuration.data === true,
      });
    }).catch(() => { if (alive) setCapabilities({ finance: false, configuration: false }); });
    return () => { alive = false; };
  }, [session, adminGate]);

  const load = React.useCallback(async () => {
    if (!session) return;
    setBusy(true); setMessage(''); setAccessDenied(false);
    try {
      const client = requireSupabase();
      const [summary, withdrawals] = await Promise.all([
        getFinanceOverview(client),
        listAdminWithdrawals(client, filter || null, 50, 0),
      ]);
      setOverview(summary); setRows(withdrawals);
    } catch (e) {
      const errorText = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Unable to load finance dashboard.';
      const denied = isFinanceAuthorizationError(e);
      setAccessDenied(denied);
      if (denied) { setOverview(null); setRows([]); }
      setMessage(errorText);
    } finally { setBusy(false); }
  }, [session, filter]);

  React.useEffect(() => { void load(); }, [load]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      const { data, error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setAccessDenied(false);
      setSession(data.session);
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Sign in failed.'); }
    finally { setBusy(false); }
  }

  async function revealPayoutDetails(id: string) {
    const workerUrl = import.meta.env.VITE_PAYOUT_DETAILS_WORKER_URL as string | undefined;
    if (!workerUrl) { setMessage('Secure payout Worker URL is not configured.'); return; }
    if (!window.confirm('Reveal this member’s bank details? This action is audited.')) return;
    setPayoutBusy(id); setMessage('');
    try {
      const { data } = await requireSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Admin session expired. Sign in again.');
      const response = await fetch(`${workerUrl.replace(/\/$/, '')}/v1/admin/payout-details/${id}`, { headers: { authorization: `Bearer ${token}` } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to retrieve payout details.');
      setPayoutDetails(current => ({ ...current, [id]: `Account name: ${body.account_name} | Account number: ${body.account_number} | Bank code: ${body.bank_code}` }));
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Payout details unavailable.'); }
    finally { setPayoutBusy(null); }
  }


  async function submitPaypalPayout(id: string) {
    const workerUrl = import.meta.env.VITE_PAYPAL_PAYOUT_WORKER_URL as string | undefined;
    if (!workerUrl) { setMessage('US PayPal Sandbox Worker URL is not configured.'); return; }
    if (!window.confirm('Submit this approved US PayPal payout to the PayPal SANDBOX? This sends a sandbox payout request.')) return;
    setPayoutBusy(id); setMessage('');
    try {
      const { data } = await requireSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Admin session expired. Sign in again.');
      const response = await fetch(`${workerUrl.replace(/\/$/, '')}/v1/admin/paypal-payouts/${id}/submit`, {
        method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: '{}',
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 202) throw new Error(body.error || 'PayPal sandbox payout submission failed.');
      setMessage(`PayPal sandbox payout status: ${body.status || 'submitted'}${body.provider_batch_id ? ` · Batch ${body.provider_batch_id}` : ''}.`);
      await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'PayPal sandbox payout submission failed.'); }
    finally { setPayoutBusy(null); }
  }

  async function decide(id: string, decision: 'approved'|'rejected'|'needs_info') {
    const label = decision === 'needs_info' ? 'request more information' : decision;
    if (!window.confirm(`Are you sure you want to ${label} this withdrawal?`)) return;
    setBusy(true); setMessage('');
    try {
      const result = await reviewWithdrawal(requireSupabase(), id, decision, notes[id] || '');
      setMessage(`Withdrawal review completed: ${result}`);
      await load();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Review failed.'); }
    finally { setBusy(false); }
  }

  if (!configured) return <main className="center"><section className="panel"><h1>Vyra Rewards Admin</h1><p>Configuration required. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> for this app.</p></section></main>;
  if (!ready) return <main className="center">Loading secure admin session…</main>;
  if (!session) return <main className="center"><form className="panel login" onSubmit={signIn}><div className="brand">VYRA <span>ADMIN</span></div><h1>Admin sign in</h1><p>Sign in with your authorized Supabase account.</p><label>Email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required /></label><button disabled={busy}>{busy ? 'Please wait…' : 'Sign in'}</button>{message && <p className="error">{message}</p>}</form></main>;

  if (adminGate === 'checking') return <main className="center"><section className="panel"><h1>Checking administrator access…</h1><p>Verifying your active Admin role with the secure database function.</p></section></main>;
  if (adminGate === 'denied') return <main className="center"><section className="panel denied"><div className="brand">VYRA <span>ADMIN</span></div><h1>Admin access denied</h1><p>This signed-in account does not have an active Admin Dashboard role. Contact the project administrator if you believe this is an error.</p><button onClick={()=>{ setPayoutDetails({}); void requireSupabase().auth.signOut(); }}>Sign out</button></section></main>;
  if (capabilities === null) return <main className="center"><section className="panel"><h1>Checking administrator permissions…</h1><p>Loading finance and configuration permissions from secure database role helpers.</p></section></main>;

  // Prevent direct navigation to privileged views even if a stale UI state remains after role changes.
  const configurationViews = ['countries', 'exchangeRates', 'providers', 'levelplay'];
  if (configurationViews.includes(activeView) && !capabilities.configuration) return <main className="center"><section className="panel denied"><h1>Configuration access denied</h1><p>Your current administrator role does not include configuration management. This restriction is also enforced by the database RPCs.</p><button className="secondary" onClick={()=>setActiveView(capabilities.finance ? 'finance' : 'support')}>Back to workspace</button></section></main>;

  if (activeView === 'paypalReconciliation') return <main className="shell"><header><div><div className="brand">VYRA <span>ADMIN</span></div><h1>PayPal reconciliation</h1><p>{session.user.email}</p></div><button className="secondary" onClick={()=>setActiveView('finance')}>Back to dashboard</button></header><AdminPaypalReconciliation accessToken={session.access_token} workerUrl={import.meta.env.VITE_PAYPAL_PAYOUT_WORKER_URL as string | undefined} /><footer>Vyra Rewards Global · PayPal Sandbox reconciliation · Read-only inspection; verified webhook remains the only settlement path.</footer></main>;

  if (activeView === 'members') return <main className="shell"><header><div><div className="brand">VYRA <span>ADMIN</span></div><h1>Member management</h1><p>{session.user.email}</p></div><button className="secondary" onClick={()=>setActiveView('finance')}>Back to dashboard</button></header><AdminMemberDirectory onBack={()=>setActiveView('finance')} /><footer>Vyra Rewards Global · Member directory · Database RPC authorization enforced.</footer></main>;

  if (activeView === 'countries') return <main className="shell"><header><div><div className="brand">VYRA <span>ADMIN</span></div><h1>Country &amp; currency management</h1><p>{session.user.email}</p></div></header><AdminCountryCurrency onBack={()=>setActiveView('finance')} /><footer>Vyra Rewards Global · Country and currency settings · Admin-only audited RPCs.</footer></main>;

  if (activeView === 'exchangeRates') return <main className="shell"><header><div><div className="brand">VYRA <span>ADMIN</span></div><h1>Coin conversion proposals</h1><p>{session.user.email}</p></div></header><AdminExchangeRates onBack={()=>setActiveView('finance')} /><footer>Vyra Rewards Global · Proposed coin conversion rates · Draft-only, admin-authorized, audited RPCs.</footer></main>;

  if (activeView === 'providers') return <main className="shell"><header><div><div className="brand">VYRA <span>ADMIN</span></div><h1>Reward provider management</h1><p>{session.user.email}</p></div></header><AdminRewardProviders onBack={()=>setActiveView('finance')} /><footer>Vyra Rewards Global · Provider catalogue · Admin-only audited RPCs; no callback activation.</footer></main>;

  if (activeView === 'rewards') return <main className="shell"><header><div><div className="brand">VYRA <span>ADMIN</span></div><h1>Reward configuration</h1><p>{session.user.email}</p></div></header><AdminRewardConfiguration onBack={()=>setActiveView('finance')} /><footer>Vyra Rewards Global · Reward configuration · Read-only admin RPC.</footer></main>;

  if (activeView === 'spin') return <main className="shell"><header><div><div className="brand">VYRA <span>ADMIN</span></div><h1>Spin &amp; Win management</h1><p>{session.user.email}</p></div></header><AdminSpinWheel onBack={()=>setActiveView('finance')} /><footer>Vyra Rewards Global · Spin &amp; Win · Admin-only database RPC controls.</footer></main>;
  if (activeView === 'levelplay') return <main className="shell"><header><div><div className="brand">VYRA <span>ADMIN</span></div><h1>LevelPlay rewarded ads</h1><p>{session.user.email}</p></div></header><AdminLevelPlay onBack={()=>setActiveView('finance')} /><footer>Vyra Rewards Global · LevelPlay S2S configuration · Admin-only audited RPC; Cloudflare Worker unchanged.</footer></main>;

  if (activeView === 'quiz') return <main className="shell"><header><div><div className="brand">VYRA <span>ADMIN</span></div><h1>Quiz Rewards management</h1><p>{session.user.email}</p></div></header><AdminQuizRewards onBack={()=>setActiveView('finance')} /><footer>Vyra Rewards Global · Quiz Rewards · Admin-only database RPC controls.</footer></main>;

  if (activeView === 'fraud') return <main className="shell"><header><div><div className="brand">VYRA <span>ADMIN</span></div><h1>Fraud review</h1><p>{session.user.email}</p></div></header><AdminFraudReview onBack={()=>setActiveView('finance')} /><footer>Vyra Rewards Global · Human fraud review · No automatic wallet or account actions.</footer></main>;

  if (activeView === 'security') return <main className="shell"><header><div><div className="brand">VYRA <span>ADMIN</span></div><h1>Account security</h1><p>{session.user.email}</p></div><button className="secondary" onClick={()=>setActiveView('finance')}>Back to dashboard</button></header><AdminSecurityCenter onBack={()=>setActiveView('finance')} /><footer>Vyra Rewards Global · Security tools · Read-only, database-authorized audit access.</footer></main>;

  if (activeView === 'support') return <main className="shell"><header><div><div className="brand">VYRA <span>ADMIN</span></div><h1>Member support</h1><p>{session.user.email}</p></div><button className="secondary" onClick={()=>{ setActiveView('finance'); if (accessDenied) void load(); }}>Back to dashboard</button></header><AdminSupportInbox onBack={()=>setActiveView('finance')} /><footer>Vyra Rewards Global · Support tools · Database RPC authorization enforced.</footer></main>;

  if (!capabilities.finance || accessDenied) return <main className="shell"><header><div><div className="brand">VYRA <span>ADMIN</span></div><h1>Administrator workspace</h1><p>{session.user.email}</p></div><div className="head-actions"><button className="secondary" onClick={()=>setActiveView('support')}>Support Inbox</button><button className="secondary" onClick={()=>setActiveView('members')}>Members</button><button className="secondary" onClick={()=>setActiveView('security')}>Security &amp; Audit</button><button className="secondary" onClick={()=>setActiveView('fraud')}>Fraud Review</button>{capabilities.configuration && <><button className="secondary" onClick={()=>setActiveView('countries')}>Countries &amp; Currencies</button><button className="secondary" onClick={()=>setActiveView('exchangeRates')}>Coin Rate Proposals</button><button className="secondary" onClick={()=>setActiveView('providers')}>Reward Providers</button><button className="secondary" onClick={()=>setActiveView('levelplay')}>LevelPlay Ads</button></>}<button onClick={()=>{ setPayoutDetails({}); void requireSupabase().auth.signOut(); }}>Sign out</button></div></header><section className="panel"><h2>Finance dashboard access is not assigned</h2><p>Your active administrator role can use the tools shown above. Withdrawal balances, payout details and finance review actions are hidden because the database did not grant finance-admin access.</p>{message && <p className="error">{message}</p>}</section><footer>Vyra Rewards Global · Least-privilege administrator workspace. Database RPC authorization remains authoritative.</footer></main>;

  const money = (v:number) => new Intl.NumberFormat('en-US').format(Number(v || 0));
  const cards: [string, number | undefined][] = [
    ['Pending withdrawals', overview?.pending_withdrawals], ['Approved / unpaid', overview?.approved_unpaid_withdrawals],
    ['Paid withdrawals', overview?.paid_withdrawals], ['Rejected withdrawals', overview?.rejected_withdrawals],
    ['Active members', overview?.active_members], ['Suspended members', overview?.suspended_members],
    ['Available coins', overview?.available_coins_total], ['Pending coins', overview?.pending_coins_total],
    ['Lifetime coins', overview?.lifetime_coins_total],
  ];
  return <main className="shell"><header><div><div className="brand">VYRA <span>ADMIN</span></div><h1>Finance dashboard</h1><p>{session.user.email}</p></div><div className="head-actions"><button className="secondary" onClick={()=>setActiveView('support')}>Support Inbox</button><button className="secondary" onClick={()=>setActiveView('members')}>Members</button><button className="secondary" onClick={()=>setActiveView('security')}>Security & Audit</button><button className="secondary" onClick={()=>setActiveView('fraud')}>Fraud Review</button><button className="secondary" onClick={()=>setActiveView('rewards')}>Reward Rules</button>{capabilities.configuration && <><button className="secondary" onClick={()=>setActiveView('countries')}>Countries &amp; Currencies</button><button className="secondary" onClick={()=>setActiveView('exchangeRates')}>Coin Rate Proposals</button><button className="secondary" onClick={()=>setActiveView('providers')}>Reward Providers</button><button className="secondary" onClick={()=>setActiveView('levelplay')}>LevelPlay Ads</button></>}<button className="secondary" onClick={()=>setActiveView('spin')}>Spin &amp; Win</button><button className="secondary" onClick={()=>setActiveView('quiz')}>Quiz Rewards</button><button className="secondary" onClick={()=>setActiveView('paypalReconciliation')}>PayPal Reconciliation</button><button className="secondary" onClick={()=>void load()} disabled={busy}>Refresh</button><button className="secondary" onClick={()=>{ setOverview(null); setRows([]); setPayoutDetails({}); setAccessDenied(false); void requireSupabase().auth.signOut(); }}>Sign out</button></div></header>
    {message && <div className="notice" role="status">{message}</div>}
    <section className="cards">{cards.map(([name,value])=><article className="metric" key={name}><span>{name}</span><strong>{value === undefined ? '—' : money(value)}</strong></article>)}</section>
    <section className="panel"><div className="section-head"><div><h2>Withdrawal requests</h2><p>Only server-authorized finance admins can read or review these records.</p></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">All statuses</option>{['requested','under_review','approved','processing','paid','rejected','cancelled','failed'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></div>
    {busy && <p>Loading…</p>}{!busy && rows.length===0 && <p>No withdrawal records found for this filter.</p>}
    <div className="table-wrap"><table><thead><tr><th>Member</th><th>Country</th><th>Amount</th><th>Status</th><th>Requested</th><th>Review action</th><th>Secure payout details</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><strong>{row.display_name || 'Member'}</strong><small>{row.user_id}</small></td><td>{row.country_code}</td><td>{money(row.amount_coins)} coins<br/><small>{row.currency_code} minor: {money(row.amount_minor)}</small></td><td><span className="pill">{row.status}</span></td><td>{new Date(row.requested_at).toLocaleString()}</td><td>{['requested','under_review'].includes(row.status) ? <div className="review"><input aria-label="Review note" placeholder="Optional note" value={notes[row.id] || ''} onChange={e=>setNotes(n=>({...n,[row.id]:e.target.value}))}/><div><button disabled={busy} onClick={()=>void decide(row.id,'approved')}>Approve</button><button className="danger" disabled={busy} onClick={()=>void decide(row.id,'rejected')}>Reject</button><button className="secondary" disabled={busy} onClick={()=>void decide(row.id,'needs_info')}>Needs info</button></div></div> : <span>—</span>}</td><td>{row.country_code === 'US' && row.payout_method === 'paypal' ? <><span>Encrypted PayPal recipient</span>{['approved','processing'].includes(row.status) && <button disabled={payoutBusy===row.id} onClick={()=>void submitPaypalPayout(row.id)}>{payoutBusy===row.id ? 'Submitting…' : 'Submit PayPal Sandbox payout'}</button>}</> : <><button className="secondary" disabled={payoutBusy===row.id} onClick={()=>void revealPayoutDetails(row.id)}>{payoutBusy===row.id ? 'Loading…' : 'Reveal bank details'}</button>{payoutDetails[row.id] && <div className="payout-sensitive"><p>{payoutDetails[row.id]}</p><button className="secondary" onClick={()=>setPayoutDetails(current=>{ const next={...current}; delete next[row.id]; return next; })}>Hide bank details</button></div>}</>}</td></tr>)}</tbody></table></div>
    </section><footer>Vyra Rewards Global · Finance tools · All decisions are recorded by the audited RPC.</footer>
  </main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
