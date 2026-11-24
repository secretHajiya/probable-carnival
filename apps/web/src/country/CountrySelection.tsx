import { useState } from 'react';
import { setMemberCountry } from '../auth/authService';
import './country-selection.css';

type CountryCode = 'NG' | 'US';
export function CountrySelection({ onSelected, onSignOut }: { onSelected: () => Promise<void>; onSignOut: () => void }) {
  const [country, setCountry] = useState<CountryCode | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    if (!country) { setError('Choose your country to continue.'); return; }
    setBusy(true); setError('');
    try { await setMemberCountry(country); await onSelected(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save your country.'); }
    finally { setBusy(false); }
  }
  return <main className="vyra-country-shell"><section className="vyra-country-card">
    <p className="vyra-country-brand">VYRA REWARDS GLOBAL</p><h1>Choose your country</h1>
    <p className="vyra-country-copy">Choose the country where you live. Your rewards remain in coins; the dashboard will display your local currency.</p>
    <div className="vyra-country-options">
      <button type="button" className={country === 'NG' ? 'selected' : ''} onClick={() => setCountry('NG')}><strong>Nigeria</strong><span>NG · Nigerian Naira (₦)</span><small>Bank transfer planned</small></button>
      <button type="button" className={country === 'US' ? 'selected' : ''} onClick={() => setCountry('US')}><strong>United States</strong><span>US · US Dollar ($)</span><small>PayPal planned</small></button>
    </div>
    {error && <p className="vyra-country-error" role="alert">{error}</p>}
    <button className="vyra-country-continue" type="button" disabled={busy || !country} onClick={() => void submit()}>{busy ? 'Saving…' : 'Continue'}</button>
    <button className="vyra-country-signout" type="button" onClick={onSignOut}>Sign out</button>
    <p className="vyra-country-footnote">Country selection is saved to your account and cannot be changed from the member dashboard. Contact support if it was selected incorrectly.</p>
  </section></main>;
}
