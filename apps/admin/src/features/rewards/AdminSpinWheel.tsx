import React from 'react';
import { requireSupabase } from '../../lib/supabase';

type SpinSegment = { key: string; label: string; coins: number; weight: number; active: boolean };
type SpinConfig = { is_enabled: boolean; daily_free_spins: number; segments: SpinSegment[]; updated_at: string | null; updated_by: string | null };
const DEFAULT_SEGMENTS: SpinSegment[] = [
  { key: 'coins_10', label: '10 Coins', coins: 10, weight: 35, active: true },
  { key: 'coins_25', label: '25 Coins', coins: 25, weight: 25, active: true },
  { key: 'coins_50', label: '50 Coins', coins: 50, weight: 18, active: true },
  { key: 'coins_100', label: '100 Coins', coins: 100, weight: 12, active: true },
  { key: 'coins_250', label: '250 Coins', coins: 250, weight: 7, active: true },
  { key: 'coins_500', label: '500 Coins', coins: 500, weight: 3, active: true },
];

export function AdminSpinWheel({ onBack }: { onBack: () => void }) {
  const [config, setConfig] = React.useState<SpinConfig | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const load = React.useCallback(async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const { data, error: readError } = await requireSupabase()
        .from('spin_wheel_config')
        .select('is_enabled,daily_free_spins,segments,updated_at,updated_by')
        .eq('id', true)
        .single();
      if (readError) throw readError;
      const raw = data as SpinConfig;
      setConfig({ ...raw, segments: Array.isArray(raw.segments) ? raw.segments : DEFAULT_SEGMENTS });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load Spin & Win settings.');
    } finally { setBusy(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  function updateSegment(index: number, patch: Partial<SpinSegment>) {
    setConfig(current => current ? ({ ...current, segments: current.segments.map((s, i) => i === index ? { ...s, ...patch } : s) }) : current);
  }
  function addSegment() {
    setConfig(current => current && current.segments.length < 16 ? ({ ...current, segments: [...current.segments, { key: `reward_${Date.now()}`, label: 'New reward', coins: 0, weight: 1, active: true }] }) : current);
  }
  function removeSegment(index: number) {
    setConfig(current => current && current.segments.length > 2 ? ({ ...current, segments: current.segments.filter((_, i) => i !== index) }) : current);
  }
  async function save() {
    if (!config) return;
    const keys = config.segments.map(s => s.key.trim());
    if (config.daily_free_spins < 1 || config.daily_free_spins > 10) { setError('Daily free spins must be between 1 and 10.'); return; }
    if (config.segments.length < 2 || config.segments.length > 16) { setError('Add between 2 and 16 reward segments.'); return; }
    if (new Set(keys).size !== keys.length || config.segments.some(s => !s.key.trim() || !s.label.trim() || !Number.isInteger(Number(s.coins)) || s.coins < 0 || s.coins > 1_000_000 || !Number.isInteger(Number(s.weight)) || s.weight < 0 || s.weight > 100_000)) { setError('Check segment keys, labels, coin amounts and weights. Keys must be unique.'); return; }
    if (!config.segments.some(s => s.active && s.weight > 0)) { setError('At least one active segment must have a weight greater than zero.'); return; }
    if (config.is_enabled && !window.confirm('Enable Spin & Win for members now? Make sure the wheel has been tested first.')) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const { error: saveError } = await requireSupabase().rpc('admin_update_spin_wheel_config', {
        p_is_enabled: config.is_enabled,
        p_daily_free_spins: config.daily_free_spins,
        p_segments: config.segments,
      });
      if (saveError) throw saveError;
      setNotice('Spin & Win settings saved successfully.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save Spin & Win settings.'); }
    finally { setSaving(false); }
  }

  return <section className="panel spin-admin">
    <div className="section-head"><div><h2>Spin &amp; Win control</h2><p>Manage the member wheel, daily spins and reward probabilities.</p></div><div className="head-actions"><button className="secondary" onClick={onBack}>Back</button><button className="secondary" onClick={() => void load()} disabled={busy || saving}>Refresh</button></div></div>
    {busy && <p>Loading Spin &amp; Win configuration…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {notice && <p className="success" role="status">{notice}</p>}
    {config && <>
      <div className="spin-admin-status"><div><span>Member access</span><strong>{config.is_enabled ? 'Enabled' : 'Disabled'}</strong><small>{config.is_enabled ? 'Members can use the wheel.' : 'Members cannot spin. This is the safe default.'}</small></div><label className="spin-toggle"><input type="checkbox" checked={config.is_enabled} onChange={e => setConfig(c => c ? ({ ...c, is_enabled: e.target.checked }) : c)} /> Enable Spin &amp; Win</label></div>
      <div className="settings-form spin-general"><label>Free spins per member each day<input type="number" min="1" max="10" value={config.daily_free_spins} onChange={e => setConfig(c => c ? ({ ...c, daily_free_spins: Number(e.target.value) }) : c)} /></label><p className="muted">Allowed range: 1–10 daily spins. Reward outcomes are selected and credited by the secure database function.</p></div>
      <div className="section-head spin-segment-heading"><div><h3>Wheel reward segments</h3><p>Weight controls relative probability. Inactive segments are excluded.</p></div><button className="secondary" onClick={addSegment} disabled={config.segments.length >= 16}>Add segment</button></div>
      <div className="table-wrap"><table className="spin-segment-table"><thead><tr><th>Segment key</th><th>Wheel label</th><th>Coins</th><th>Weight</th><th>Active</th><th>Action</th></tr></thead><tbody>{config.segments.map((segment, index) => <tr key={`${segment.key}-${index}`}><td><input aria-label="Segment key" value={segment.key} onChange={e => updateSegment(index, { key: e.target.value })} maxLength={64} /></td><td><input aria-label="Wheel label" value={segment.label} onChange={e => updateSegment(index, { label: e.target.value })} maxLength={48} /></td><td><input aria-label="Reward coins" type="number" min="0" max="1000000" value={segment.coins} onChange={e => updateSegment(index, { coins: Number(e.target.value) })} /></td><td><input aria-label="Probability weight" type="number" min="0" max="100000" value={segment.weight} onChange={e => updateSegment(index, { weight: Number(e.target.value) })} /></td><td><input aria-label="Segment active" type="checkbox" checked={segment.active} onChange={e => updateSegment(index, { active: e.target.checked })} /></td><td><button className="danger" onClick={() => removeSegment(index)} disabled={config.segments.length <= 2}>Remove</button></td></tr>)}</tbody></table></div>
      <div className="spin-save-row"><p className="muted">Last updated: {config.updated_at ? new Date(config.updated_at).toLocaleString() : 'Not available'}</p><button onClick={() => void save()} disabled={saving || busy}>{saving ? 'Saving…' : 'Save Spin & Win settings'}</button></div>
      <p className="muted">Important: Enabling this setting makes the wheel available to members. Withdrawal settings are separate and are not changed here.</p>
    </>}
  </section>;
}
