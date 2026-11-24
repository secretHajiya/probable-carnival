import { useCallback, useEffect, useState } from 'react';
import { requireSupabase } from '../lib/supabase';
import './earn.css';

type WallConfig = { iframeUrl: string; providerEnabled: boolean };

export function EarnCenter({ email }: { email?: string }) {
  const [config, setConfig] = useState<WallConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const db = requireSupabase();
      const { data, error: invokeError } = await db.functions.invoke('cpx-wall-config');
      if (invokeError) throw invokeError;
      if (!data?.iframeUrl) throw new Error('CPX Research configuration is not available yet.');
      setConfig(data as WallConfig);
    } catch (e) {
      setConfig(null);
      setError(e instanceof Error ? e.message : 'Unable to load CPX Research.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, retry]);

  return <main className="vearn">
    <header className="vearn-head">
      <div><span className="vearn-brand">VYRA REWARDS GLOBAL</span><h1>Earn Center</h1><p>Discover available research opportunities.</p></div>
      <button onClick={() => setRetry(v => v + 1)} disabled={loading}>Refresh</button>
    </header>
    <section className="vearn-provider">
      <div className="vearn-provider-title"><div><span className="vearn-tag">RESEARCH PARTNER</span><h2>CPX Research</h2></div><span className="vearn-status">{config?.providerEnabled ? 'Provider enabled' : 'Connection status'}</span></div>
      <p>Survey availability depends on your country and research profile. Answer surveys honestly and follow each provider's rules.</p>
      {loading && <p className="vearn-message">Connecting securely…</p>}
      {!loading && error && <div className="vearn-error" role="alert"><p>{error}</p><button onClick={() => setRetry(v => v + 1)}>Try again</button></div>}
      {!loading && config?.iframeUrl && <div className="vearn-frame-wrap"><iframe title="CPX Research surveys" src={config.iframeUrl} width="100%" height="1900" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="clipboard-read; clipboard-write" /></div>}
      <p className="vearn-footnote">Rewards are credited only after the provider's signed completion notification is verified by the server. A survey screen alone does not mean a reward has been credited.</p>
    </section>
    <nav className="vearn-nav"><button onClick={() => window.location.assign('/')}>Back to dashboard</button><span>{email || ''}</span></nav>
  </main>;
}
