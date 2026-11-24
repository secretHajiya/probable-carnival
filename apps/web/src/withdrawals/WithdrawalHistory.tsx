import { useCallback, useEffect, useState } from 'react';
import { requireSupabase } from '../lib/supabase';
import './withdrawals.css';

type Withdrawal = { id: string; country_code: string; payout_method: string; amount_coins: number; amount_minor: number; currency_code: string; fee_minor: number; status: string; requested_at: string; reviewed_at: string | null; rejection_reason: string | null };
type Availability = { status: 'loading' | 'enabled' | 'paypal-enabled' | 'disabled' | 'unsupported' | 'unavailable'; countryCode: string | null; minCoins: number | null; maxCoins: number | null; feeBps: number | null };

export function WithdrawalHistory({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [amountCoins, setAmountCoins] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [availability, setAvailability] = useState<Availability>({ status: 'loading', countryCode: null, minCoins: null, maxCoins: null, feeBps: null });
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const db = requireSupabase();
      setAvailability({ status: 'loading', countryCode: null, minCoins: null, maxCoins: null, feeBps: null });
      const { data: auth, error: authError } = await db.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error('Your session has expired. Please sign in again.');
      const [historyResult, profileResult] = await Promise.all([
        db.from('withdrawal_requests')
          .select('id,country_code,payout_method,amount_coins,amount_minor,currency_code,fee_minor,status,requested_at,reviewed_at,rejection_reason')
          .eq('user_id', auth.user.id).order('requested_at', { ascending: false }).limit(50),
        db.from('profiles').select('country_code').eq('id', auth.user.id).maybeSingle(),
      ]);
      if (historyResult.error) throw historyResult.error;
      setItems((historyResult.data ?? []) as Withdrawal[]);
      if (profileResult.error) {
        setAvailability({ status: 'unavailable', countryCode: null, minCoins: null, maxCoins: null, feeBps: null });
      } else {
        const countryCode = profileResult.data?.country_code?.trim() || null;
        if (!countryCode) {
          setAvailability({ status: 'disabled', countryCode: null, minCoins: null, maxCoins: null, feeBps: null });
        } else {
          const config = await db.from('withdrawal_config')
            .select('min_coins,max_coins,fee_bps,is_enabled')
            .eq('country_code', countryCode).maybeSingle();
          if (config.error) {
            setAvailability({ status: 'unavailable', countryCode, minCoins: null, maxCoins: null, feeBps: null });
          } else if (!config.data || !config.data.is_enabled) {
            setAvailability({ status: 'disabled', countryCode, minCoins: null, maxCoins: null, feeBps: null });
          } else if (countryCode === 'US') {
            // US requests use the isolated PayPal Worker and dedicated RPC only.
            setAvailability({ status: 'paypal-enabled', countryCode, minCoins: Number(config.data.min_coins), maxCoins: Number(config.data.max_coins), feeBps: Number(config.data.fee_bps) });
          } else if (countryCode !== 'NG') {
            setAvailability({ status: 'unsupported', countryCode, minCoins: Number(config.data.min_coins), maxCoins: Number(config.data.max_coins), feeBps: Number(config.data.fee_bps) });
          } else {
            setAvailability({ status: 'enabled', countryCode, minCoins: Number(config.data.min_coins), maxCoins: Number(config.data.max_coins), feeBps: Number(config.data.fee_bps) });
          }
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load withdrawal history.'); setAvailability({ status: 'unavailable', countryCode: null, minCoins: null, maxCoins: null, feeBps: null }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load, reload]);
  async function submitWithdrawal(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setSubmitMessage(''); setError('');
    try {
      const amount = Number(amountCoins);
      if (!['enabled', 'paypal-enabled'].includes(availability.status) || !availability.countryCode) throw new Error('Withdrawals are not enabled for your country.');
      if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Enter a valid whole-number coin amount.');
      if (amount < (availability.minCoins ?? 1) || amount > (availability.maxCoins ?? Number.MAX_SAFE_INTEGER)) throw new Error('Amount is outside the currently allowed withdrawal range.');
      const db = requireSupabase();
      const { data: sessionData, error: sessionError } = await db.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Your session has expired. Sign in again.');
      let withdrawalId: unknown;
      if (availability.countryCode === 'US' && availability.status === 'paypal-enabled') {
        const workerUrl = import.meta.env.VITE_PAYPAL_PAYOUT_WORKER_URL as string | undefined;
        if (!workerUrl) throw new Error('US PayPal payout service is not configured.');
        const issued = await fetch(`${workerUrl.replace(/\/$/, '')}/v1/paypal-recipient`, {
          method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
          body: JSON.stringify({ email: paypalEmail.trim() }),
        });
        const issuedBody = await issued.json().catch(() => ({}));
        if (!issued.ok || typeof issuedBody.token !== 'string') throw new Error(issuedBody.error || 'Unable to secure PayPal recipient.');
        setPaypalEmail('');
        const result = await db.rpc('create_us_paypal_withdrawal_request', {
          p_amount_coins: amount, p_recipient_token: issuedBody.token,
        });
        if (result.error) throw result.error;
        withdrawalId = result.data;
      } else {
        const workerUrl = import.meta.env.VITE_PAYOUT_DETAILS_WORKER_URL as string | undefined;
        if (!workerUrl) throw new Error('Secure payout service is not configured.');
        const issued = await fetch(`${workerUrl.replace(/\/$/, '')}/v1/payout-details`, {
          method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
          body: JSON.stringify({ country_code: availability.countryCode, payout_method: 'bank_transfer', account_number: accountNumber.trim(), bank_code: bankCode.trim(), account_name: accountName.trim() }),
        });
        const issuedBody = await issued.json().catch(() => ({}));
        if (!issued.ok || typeof issuedBody.token !== 'string') throw new Error(issuedBody.error || 'Unable to secure payout details.');
        setAccountNumber(''); setBankCode(''); setAccountName('');
        const result = await db.rpc('create_withdrawal_request', {
          p_amount_coins: amount, p_payout_details_token: issuedBody.token,
        });
        if (result.error) throw result.error;
        withdrawalId = result.data;
      }
      setSubmitMessage(`Withdrawal request ${String(withdrawalId)} submitted successfully.`);
      setAmountCoins(''); setAccountNumber(''); setBankCode(''); setAccountName(''); setPaypalEmail('');
      setReload(x => x + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Withdrawal request failed.'); }
    finally { setSubmitting(false); }
  }
  const coins = (n: number) => new Intl.NumberFormat().format(n || 0);
  const money = (minor: number, currency: string) => `${currency} ${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return <main className="vw-page"><header className="vw-header"><button onClick={onBack}>← Dashboard</button><b>VYRA REWARDS GLOBAL</b></header><section className="vw-content"><div className="vw-heading"><div><p>YOUR ACCOUNT</p><h1>Withdrawal history</h1><span>Review the status of your withdrawal requests.</span></div><button onClick={() => setReload(x => x + 1)}>Refresh</button></div>
    {availability.status === 'loading' && <section className="vw-request-form"><h2>Withdrawal availability</h2><p>Checking your country settings…</p></section>}
    {availability.status === 'enabled' && <form className="vw-request-form" onSubmit={submitWithdrawal}><h2>Request a withdrawal</h2><p>Nigeria bank transfer only. Your bank details are encrypted by the secure payout service.</p><p>Allowed range: {coins(availability.minCoins ?? 0)}–{coins(availability.maxCoins ?? 0)} coins · Fee: {((availability.feeBps ?? 0) / 100).toFixed(2)}%</p><label>Amount (coins)<input inputMode="numeric" pattern="[0-9]+" min={availability.minCoins ?? undefined} max={availability.maxCoins ?? undefined} value={amountCoins} onChange={e=>setAmountCoins(e.target.value)} required /></label><label>Account name<input value={accountName} onChange={e=>setAccountName(e.target.value)} maxLength={100} autoComplete="name" required /></label><label>Bank code<input value={bankCode} onChange={e=>setBankCode(e.target.value)} minLength={3} maxLength={10} required /></label><label>10-digit account number<input inputMode="numeric" pattern="[0-9]{10}" value={accountNumber} onChange={e=>setAccountNumber(e.target.value.replace(/\D/g,'').slice(0,10))} required /></label><button type="submit" disabled={submitting}>{submitting ? 'Submitting securely…' : 'Submit withdrawal request'}</button>{submitMessage && <p role="status">{submitMessage}</p>}</form>}
    {availability.status === 'paypal-enabled' && <form className="vw-request-form" onSubmit={submitWithdrawal}><h2>Request a US PayPal withdrawal</h2><p>Your PayPal email is encrypted by the dedicated US PayPal service. Finance review is required before payout. This feature is available only when US withdrawals are enabled.</p><p>Allowed range: {coins(availability.minCoins ?? 0)}–{coins(availability.maxCoins ?? 0)} coins · Fee: {((availability.feeBps ?? 0) / 100).toFixed(2)}%</p><label>Amount (coins)<input inputMode="numeric" pattern="[0-9]+" min={availability.minCoins ?? undefined} max={availability.maxCoins ?? undefined} value={amountCoins} onChange={e=>setAmountCoins(e.target.value)} required /></label><label>PayPal email<input type="email" autoComplete="email" maxLength={254} value={paypalEmail} onChange={e=>setPaypalEmail(e.target.value)} required /></label><button type="submit" disabled={submitting}>{submitting ? 'Submitting securely…' : 'Submit PayPal withdrawal'}</button>{submitMessage && <p role="status">{submitMessage}</p>}</form>}
    {availability.status === 'disabled' && <section className="vw-request-form"><h2>Withdrawals unavailable</h2><p>Withdrawal requests are currently disabled for your country. You can still view your existing withdrawal history.</p></section>}
    {availability.status === 'unsupported' && <section className="vw-request-form"><h2>Payment method unavailable</h2><p>Your account country ({availability.countryCode}) is not yet supported by the current payout method. US PayPal withdrawals are available only when the country configuration is enabled.</p></section>}
    {availability.status === 'unavailable' && <section className="vw-request-form"><h2>Withdrawal settings unavailable</h2><p>We could not verify the active withdrawal configuration. Requests are disabled for safety; please try again later.</p></section>}
    {error && <p className="vw-error" role="alert">{error}</p>}
    {loading ? <p className="vw-empty">Loading withdrawal history…</p> : items.length === 0 ? <p className="vw-empty">You have not submitted a withdrawal request yet.</p> : <div className="vw-list">{items.map(x => <article className="vw-item" key={x.id}><div className="vw-item-top"><b>{coins(x.amount_coins)} coins</b><span className={`vw-status vw-${x.status.toLowerCase()}`}>{x.status.replaceAll('_', ' ')}</span></div><p>{money(x.amount_minor, x.currency_code)} · Fee {money(x.fee_minor, x.currency_code)}</p><small>{x.country_code} · {x.payout_method.replaceAll('_', ' ')} · {new Date(x.requested_at).toLocaleString()}</small>{x.rejection_reason && <p className="vw-reason">Reason: {x.rejection_reason}</p>}</article>)}</div>}
    <p className="vw-safety">For your security, payout recipient details are encrypted by the dedicated country-specific payout service. The app does not store plain bank or PayPal recipient details in the withdrawal record.</p>
  </section></main>;
}
