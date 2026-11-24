import React from 'react';
import { requireSupabase } from '../../lib/supabase';
import { getCountryCurrencySettings, saveCountrySetting, saveCurrencySetting, type CountryCurrencySnapshot, type CountrySetting, type CurrencySetting } from './countryCurrency';

const blankCountry = (): CountrySetting => ({ country_code: '', country_name: '', default_currency_code: '', timezone_name: 'UTC', is_enabled: false });
const blankCurrency = (): CurrencySetting => ({ currency_code: '', currency_name: '', minor_units: 2, is_enabled: false });

export function AdminCountryCurrency({ onBack }: { onBack: () => void }) {
  const [data, setData] = React.useState<CountryCurrencySnapshot | null>(null);
  const [country, setCountry] = React.useState<CountrySetting>(blankCountry);
  const [currency, setCurrency] = React.useState<CurrencySetting>(blankCurrency);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const load = React.useCallback(async () => {
    setBusy(true); setError('');
    try { setData(await getCountryCurrencySettings(requireSupabase())); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load country and currency settings.'); }
    finally { setBusy(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  async function submitCountry(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await saveCountrySetting(requireSupabase(), country);
      setNotice(`Country ${country.country_code.toUpperCase()} saved. Audit record created.`);
      setCountry(blankCountry()); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Country save failed.'); }
    finally { setBusy(false); }
  }
  async function submitCurrency(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await saveCurrencySetting(requireSupabase(), currency);
      setNotice(`Currency ${currency.currency_code.toUpperCase()} saved. Audit record created.`);
      setCurrency(blankCurrency()); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Currency save failed.'); }
    finally { setBusy(false); }
  }

  return <section className="panel country-currency">
    <div className="section-head"><div><h2>Country &amp; currency settings</h2><p>Admin-managed ISO-style codes, default currency, timezone and enablement.</p></div><div className="head-actions"><button className="secondary" onClick={onBack}>Back</button><button className="secondary" onClick={() => void load()} disabled={busy}>Refresh</button></div></div>
    <div className="notice">Safety: new entries are disabled. A country can only be enabled when its default currency is enabled. This module does not create exchange rates, enable withdrawals, or activate payouts.</div>
    {error && <p className="error" role="alert">{error}</p>}{notice && <p className="success" role="status">{notice}</p>}{busy && <p>Loading / saving…</p>}
    <div className="settings-forms">
      <form className="settings-form" onSubmit={submitCurrency}>
        <h3>Add or update currency</h3>
        <label>Currency code (3 letters)<input required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" value={currency.currency_code} onChange={e => setCurrency(v => ({ ...v, currency_code: e.target.value.toUpperCase() }))} placeholder="NGN" /></label>
        <label>Currency name<input required minLength={2} maxLength={100} value={currency.currency_name} onChange={e => setCurrency(v => ({ ...v, currency_name: e.target.value }))} placeholder="Nigerian Naira" /></label>
        <label>Minor units<select value={currency.minor_units} onChange={e => setCurrency(v => ({ ...v, minor_units: Number(e.target.value) }))}>{[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
        <label className="check-line"><input type="checkbox" checked={currency.is_enabled} onChange={e => setCurrency(v => ({ ...v, is_enabled: e.target.checked }))} /> Enable currency</label>
        <button disabled={busy}>Save currency</button>
      </form>
      <form className="settings-form" onSubmit={submitCountry}>
        <h3>Add or update country</h3>
        <label>Country code (2 letters)<input required minLength={2} maxLength={2} pattern="[A-Za-z]{2}" value={country.country_code} onChange={e => setCountry(v => ({ ...v, country_code: e.target.value.toUpperCase() }))} placeholder="NG" /></label>
        <label>Country name<input required minLength={2} maxLength={100} value={country.country_name} onChange={e => setCountry(v => ({ ...v, country_name: e.target.value }))} placeholder="Nigeria" /></label>
        <label>Default currency<select required value={country.default_currency_code} onChange={e => setCountry(v => ({ ...v, default_currency_code: e.target.value }))}><option value="">Choose currency</option>{(data?.currencies || []).map(c => <option key={c.currency_code} value={c.currency_code}>{c.currency_code} — {c.currency_name}{c.is_enabled ? '' : ' (disabled)'}</option>)}</select></label>
        <label>Timezone<input required value={country.timezone_name} onChange={e => setCountry(v => ({ ...v, timezone_name: e.target.value }))} placeholder="Africa/Lagos" /></label>
        <label className="check-line"><input type="checkbox" checked={country.is_enabled} onChange={e => setCountry(v => ({ ...v, is_enabled: e.target.checked }))} /> Enable country</label>
        <button disabled={busy}>Save country</button>
      </form>
    </div>
    <h3>Configured currencies ({data?.currencies.length ?? 0})</h3>
    <div className="table-wrap"><table className="settings-table"><thead><tr><th>Code</th><th>Name</th><th>Minor units</th><th>Status</th></tr></thead><tbody>{(data?.currencies || []).map(c => <tr key={c.currency_code}><td><strong>{c.currency_code}</strong></td><td>{c.currency_name}</td><td>{c.minor_units}</td><td><span className="pill">{c.is_enabled ? 'Enabled' : 'Disabled'}</span></td></tr>)}{data?.currencies.length === 0 && <tr><td colSpan={4}>No currencies configured.</td></tr>}</tbody></table></div>
    <h3>Configured countries ({data?.countries.length ?? 0})</h3>
    <div className="table-wrap"><table className="settings-table"><thead><tr><th>Code</th><th>Country</th><th>Default currency</th><th>Timezone</th><th>Status</th></tr></thead><tbody>{(data?.countries || []).map(c => <tr key={c.country_code}><td><strong>{c.country_code}</strong></td><td>{c.country_name}</td><td>{c.default_currency_code}</td><td>{c.timezone_name}</td><td><span className="pill">{c.is_enabled ? 'Enabled' : 'Disabled'}</span></td></tr>)}{data?.countries.length === 0 && <tr><td colSpan={5}>No countries configured.</td></tr>}</tbody></table></div>
    <p className="muted">Every successful change is recorded by the database audit log. Sensitive application settings are not displayed by this screen.</p>
  </section>;
}
