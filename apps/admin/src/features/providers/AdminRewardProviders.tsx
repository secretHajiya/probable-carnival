import React from 'react';
import { requireSupabase } from '../../lib/supabase';
import { listRewardProviders, saveRewardProvider, saveRewardProviderApp, type ProviderConfig, type ProviderSnapshot } from './providerManagement';
import type { ProviderAppConfig } from './providerManagement';

const blankProvider = () => ({ code: '', name: '', type: 'offerwall' as ProviderConfig['integration_type'], enabled: false, secretReference: '', notes: '' });
const blankApp = () => ({ providerCode: '', platform: 'web' as ProviderAppConfig['platform'], externalAppId: '', countryCode: '', enabled: false });
export function AdminRewardProviders({ onBack }: { onBack: () => void }) {
  const [data, setData] = React.useState<ProviderSnapshot | null>(null);
  const [provider, setProvider] = React.useState(blankProvider);
  const [app, setApp] = React.useState(blankApp);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const load = React.useCallback(async () => {
    setBusy(true); setError('');
    try { const result = await listRewardProviders(requireSupabase()); setData(result); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load provider settings.'); }
    finally { setBusy(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  async function submitProvider(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await saveRewardProvider(requireSupabase(), provider);
      setNotice(`Provider ${provider.code.toLowerCase()} saved. An audit record was created.`);
      setProvider(blankProvider()); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Provider save failed.'); }
    finally { setBusy(false); }
  }
  async function submitApp(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await saveRewardProviderApp(requireSupabase(), app);
      setNotice(`Provider app mapping for ${app.providerCode} / ${app.countryCode.toUpperCase()} saved.`);
      setApp(blankApp()); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Provider app mapping save failed.'); }
    finally { setBusy(false); }
  }
  function editProvider(p: ProviderConfig) {
    setProvider({ code: p.provider_code, name: p.display_name, type: p.integration_type, enabled: p.is_enabled, secretReference: '', notes: p.notes });
    setNotice('Provider loaded into the form. Enter a new secret-manager reference only if you intend to replace it; leaving the field blank preserves the current reference.');
  }
  return <section className="panel provider-management">
    <div className="section-head"><div><h2>Reward provider management</h2><p>Configure offerwall/survey providers and per-country platform app mappings.</p></div><div className="head-actions"><button className="secondary" onClick={onBack}>Back</button><button className="secondary" onClick={() => void load()} disabled={busy}>Refresh</button></div></div>
    <div className="notice">Safety: new providers and app mappings are disabled. Enabling requires an existing server-side secret reference and an enabled country. Never paste an API secret, hash, password, or token into this dashboard. CPX stays disabled until its live callback and reversal tests pass.</div>
    {error && <p className="error" role="alert">{error}</p>}{notice && <p className="success" role="status">{notice}</p>}{busy && <p>Loading / saving…</p>}
    <div className="settings-forms">
      <form className="settings-form" onSubmit={submitProvider}>
        <h3>Add or update provider</h3>
        <label>Provider code<input required minLength={2} maxLength={40} pattern="[a-z][a-z0-9_-]{1,39}" value={provider.code} onChange={e => setProvider(v => ({ ...v, code: e.target.value.toLowerCase() }))} placeholder="cpx" /></label>
        <label>Display name<input required minLength={2} maxLength={100} value={provider.name} onChange={e => setProvider(v => ({ ...v, name: e.target.value }))} placeholder="CPX Research" /></label>
        <label>Integration type<select value={provider.type} onChange={e => setProvider(v => ({ ...v, type: e.target.value as ProviderConfig['integration_type'] }))}>{['offerwall','survey','task','other'].map(t => <option key={t} value={t}>{t}</option>)}</select></label>
        <label>Server-side secret reference (not the secret itself)<input maxLength={160} value={provider.secretReference} onChange={e => setProvider(v => ({ ...v, secretReference: e.target.value }))} placeholder="e.g. CPX_SECURE_HASH binding name" autoComplete="off" /></label>
        <label>Admin notes<textarea maxLength={1000} rows={3} value={provider.notes} onChange={e => setProvider(v => ({ ...v, notes: e.target.value }))} /></label>
        <label className="check-line"><input type="checkbox" checked={provider.enabled} onChange={e => setProvider(v => ({ ...v, enabled: e.target.checked }))} /> Enable provider</label>
        <button disabled={busy}>Save provider</button>
      </form>
      <form className="settings-form" onSubmit={submitApp}>
        <h3>Platform / country app mapping</h3>
        <label>Provider<select required value={app.providerCode} onChange={e => setApp(v => ({ ...v, providerCode: e.target.value }))}><option value="">Choose provider</option>{(data?.providers || []).map(p => <option key={p.provider_code} value={p.provider_code}>{p.display_name} ({p.provider_code}){p.is_enabled ? '' : ' — disabled'}</option>)}</select></label>
        <label>Platform<select value={app.platform} onChange={e => setApp(v => ({ ...v, platform: e.target.value as ProviderAppConfig['platform'] }))}>{['web','android','ios'].map(p => <option key={p} value={p}>{p}</option>)}</select></label>
        <label>External app ID<input required maxLength={120} value={app.externalAppId} onChange={e => setApp(v => ({ ...v, externalAppId: e.target.value }))} placeholder="Provider-issued app ID" /></label>
        <label>Country code<input required minLength={2} maxLength={2} pattern="[A-Za-z]{2}" value={app.countryCode} onChange={e => setApp(v => ({ ...v, countryCode: e.target.value.toUpperCase() }))} placeholder="NG" /></label>
        <label className="check-line"><input type="checkbox" checked={app.enabled} onChange={e => setApp(v => ({ ...v, enabled: e.target.checked }))} /> Enable mapping</label>
        <button disabled={busy}>Save app mapping</button>
      </form>
    </div>
    <h3>Registered providers ({data?.providers.length ?? 0})</h3>
    <div className="table-wrap"><table className="settings-table provider-table"><thead><tr><th>Code / name</th><th>Type</th><th>Status</th><th>Secret reference</th><th>Notes</th><th>Updated</th><th>Action</th></tr></thead><tbody>{(data?.providers || []).map(p => <tr key={p.provider_code}><td><strong>{p.provider_code}</strong><small>{p.display_name}</small></td><td>{p.integration_type}</td><td><span className="pill">{p.is_enabled ? 'Enabled' : 'Disabled'}</span></td><td>{p.secret_configured ? 'Configured (value hidden)' : 'Not configured'}</td><td>{p.notes || '—'}</td><td>{p.updated_at ? new Date(p.updated_at).toLocaleString() : '—'}</td><td><button className="secondary" onClick={() => editProvider(p)}>Edit</button></td></tr>)}{data?.providers.length === 0 && <tr><td colSpan={7}>No providers registered.</td></tr>}</tbody></table></div>
    <h3>Platform app mappings ({data?.apps.length ?? 0})</h3>
    <div className="table-wrap"><table className="settings-table"><thead><tr><th>Provider</th><th>Platform</th><th>External app ID</th><th>Country</th><th>Status</th></tr></thead><tbody>{(data?.apps || []).map(a => <tr key={a.id}><td>{a.provider_code}</td><td>{a.platform}</td><td>{a.external_app_id}</td><td>{a.country_code}</td><td><span className="pill">{a.is_enabled ? 'Enabled' : 'Disabled'}</span></td></tr>)}{data?.apps.length === 0 && <tr><td colSpan={5}>No app mappings configured.</td></tr>}</tbody></table></div>
    <p className="muted">Provider secrets are never returned to the browser. This module does not implement callback verification, issue rewards, or prove that a provider is live. Those require separate server-side integration and staging tests.</p>
  </section>;
}
