import React from 'react';
import { requireSupabase } from '../../lib/supabase';
import { getExchangeRateDrafts, saveExchangeRateDraft, activateExchangeRateDraft, type ExchangeRateDraftSnapshot } from './exchangeRateDrafts';

export function AdminExchangeRates({ onBack }: { onBack: () => void }) {
  const [data, setData] = React.useState<ExchangeRateDraftSnapshot | null>(null);
  const [countryCode, setCountryCode] = React.useState('');
  const [coins, setCoins] = React.useState('');
  const [rationale, setRationale] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const load = React.useCallback(async () => {
    setBusy(true); setError('');
    try {
      const snapshot = await getExchangeRateDrafts(requireSupabase());
      setData(snapshot);
      if (snapshot.countries.length) setCountryCode(current => current || snapshot.countries[0].country_code);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load proposed conversion rates.'); }
    finally { setBusy(false); }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const selectedCountry = data?.countries.find(c => c.country_code === countryCode);

  async function activate(draftId: string) {
    if (!window.confirm('Approve and activate this exchange rate now? It will affect live monetary calculations.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await activateExchangeRateDraft(requireSupabase(), draftId);
      setNotice(`Approved and activated: ${result.country_code}/${result.currency_code} — ${new Intl.NumberFormat('en-US').format(result.coins_per_major_unit)} coins per unit.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not activate the exchange rate. Ensure you are signed in as Super Admin with MFA step-up (AAL2).'); }
    finally { setBusy(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const amount = Number(coins);
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 9_000_000_000_000_000) throw new Error('Enter a positive whole-number coin rate.');
      if (!selectedCountry?.is_enabled) throw new Error('Choose an enabled country before saving a proposal.');
      await saveExchangeRateDraft(requireSupabase(), {
        country_code: selectedCountry.country_code,
        currency_code: selectedCountry.default_currency_code,
        coins_per_major_unit: amount,
        rationale,
      });
      setNotice(`Proposal saved for ${selectedCountry.country_code} (${selectedCountry.default_currency_code}). It is not active.`);
      setCoins(''); setRationale(''); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the proposed rate.'); }
    finally { setBusy(false); }
  }

  return <section className="panel country-currency">
    <div className="section-head"><div><h2>Coin conversion rate proposals</h2><p>Prepare proposed coin values for each country's main currency.</p></div><div className="head-actions"><button className="secondary" onClick={onBack}>Back</button><button className="secondary" onClick={() => void load()} disabled={busy}>Refresh</button></div></div>
    <div className="notice"><strong>Safety:</strong> saving creates a pending proposal only and does not activate live rates. Only an active Super Admin with MFA step-up (AAL2) can use Approve &amp; Activate. Support, Finance Reviewer, and regular Admin cannot activate rates. Every activation records the actor, previous live rate, new rate, and timestamp.</div>
    {error && <p className="error" role="alert">{error}</p>}{notice && <p className="success" role="status">{notice}</p>}{busy && <p>Loading / saving…</p>}
    <form className="settings-form" onSubmit={submit}>
      <h3>New or updated proposal</h3>
      <label>Country<select required value={countryCode} onChange={e => setCountryCode(e.target.value)}><option value="">Choose country</option>{(data?.countries || []).map(c => <option key={c.country_code} value={c.country_code}>{c.country_name} ({c.country_code}) — {c.default_currency_code}{c.is_enabled ? '' : ' (disabled)'}</option>)}</select></label>
      <label>Coins per 1 {selectedCountry?.default_currency_code || 'currency unit'}<input required inputMode="numeric" pattern="[0-9]+" min="1" max="9000000000000000" value={coins} onChange={e => setCoins(e.target.value)} placeholder="Enter approved proposal" /></label>
      <label>Reason / approval reference<textarea required minLength={5} maxLength={500} value={rationale} onChange={e => setRationale(e.target.value)} placeholder="Why is this rate being proposed? Include approval reference." /></label>
      <button disabled={busy || !selectedCountry?.is_enabled}>Save proposal only</button>
    </form>
    <h3>Pending proposals ({data?.drafts.length ?? 0})</h3>
    <div className="table-wrap"><table className="settings-table"><thead><tr><th>Country</th><th>Currency</th><th>Coins per unit</th><th>Reason</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>
      {(data?.drafts || []).map(d => <tr key={d.id}><td><strong>{d.country_name} ({d.country_code})</strong></td><td>{d.currency_code}</td><td>{new Intl.NumberFormat('en-US').format(d.coins_per_major_unit)}</td><td>{d.rationale}</td><td><span className="pill">{d.status === 'activated' ? 'Activated' : 'Pending'}</span></td><td>{new Date(d.created_at).toLocaleString()}</td><td>{d.status === 'pending' ? <button type="button" disabled={busy} onClick={() => void activate(d.id)}>Approve &amp; Activate</button> : <span className="muted">Activated {d.activated_at ? new Date(d.activated_at).toLocaleString() : ''}</span>}</td></tr>)}
      {data?.drafts.length === 0 && <tr><td colSpan={7}>No proposals have been saved.</td></tr>}
    </tbody></table></div>
    <p className="muted">Configuration Admins can prepare proposals. Activation is restricted server-side to one active Super Admin session with MFA step-up; approval and activation happen atomically and are audited. This source migration must be reviewed and applied separately before the control becomes available in Production.</p>
  </section>;
}
