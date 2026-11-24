import { useCallback, useEffect, useMemo, useState } from 'react';
import { requireSupabase } from '../lib/supabase';
import './spin-wheel.css';

type Segment = { key: string; label: string; coins: number; weight: number; active: boolean };
type SpinResult = { spin_id: string; reward_key: string; reward_label: string; reward_coins: number; spins_remaining: number; available_coins: number };
type SpinHistory = { id: string; reward_label: string; reward_coins: number; created_at: string };
const COLORS = ['#6d35d4', '#f0a52b', '#168b78', '#e65d76', '#316bd6', '#9a55ad', '#cf7d24', '#258bba'];

export function SpinWheel({ onReward }: { onReward: () => void }) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [history, setHistory] = useState<SpinHistory[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [message, setMessage] = useState('');

  const activeSegments = useMemo(() => segments.filter(s => s.active && s.weight > 0), [segments]);
  const wheelBackground = useMemo(() => {
    if (!activeSegments.length) return 'conic-gradient(#e7e2f2 0deg 360deg)';
    const total = activeSegments.reduce((sum, s) => sum + s.weight, 0);
    let cursor = 0;
    const stops = activeSegments.map((s, i) => {
      const start = cursor / total * 360;
      cursor += s.weight;
      const end = cursor / total * 360;
      return `${COLORS[i % COLORS.length]} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${stops.join(',')})`;
  }, [activeSegments]);

  const load = useCallback(async () => {
    setLoading(true); setMessage('');
    try {
      const db = requireSupabase();
      const { data: authData, error: authError } = await db.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error('Please sign in to use Spin & Win.');
      const [config, spins, profile] = await Promise.all([
        db.from('spin_wheel_config').select('is_enabled,daily_free_spins,segments').eq('id', true).maybeSingle(),
        db.from('spin_wheel_spins').select('id,reward_label,reward_coins,created_at').order('created_at', { ascending: false }).limit(5),
        db.from('profiles').select('country_code').eq('id', authData.user.id).maybeSingle(),
      ]);
      if (config.error) throw config.error;
      if (spins.error) throw spins.error;
      if (profile.error) throw profile.error;
      const cfg = config.data as { is_enabled: boolean; daily_free_spins: number; segments: Segment[] } | null;
      const timezone = profile.data?.country_code === 'US' ? 'America/New_York' : 'Africa/Lagos';
      const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const today = await db.from('spin_wheel_spins').select('id', { count: 'exact', head: true }).eq('user_id', authData.user.id).eq('spin_date', localDate);
      if (today.error) throw today.error;
      setEnabled(Boolean(cfg?.is_enabled));
      setSegments(Array.isArray(cfg?.segments) ? cfg.segments : []);
      setRemaining(Math.max(0, Number(cfg?.daily_free_spins ?? 0) - (today.count ?? 0)));
      setHistory((spins.data ?? []) as SpinHistory[]);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not load Spin & Win.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function spin() {
    if (spinning || !enabled || remaining < 1) return;
    setSpinning(true); setResult(null); setMessage('');
    try {
      const { data, error } = await requireSupabase().rpc('spin_wheel');
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as SpinResult | null;
      if (!row) throw new Error('The spin service returned no result.');
      const index = activeSegments.findIndex(s => s.key === row.reward_key);
      const total = activeSegments.reduce((sum, s) => sum + s.weight, 0);
      let start = 0;
      for (let i = 0; i < Math.max(index, 0); i++) start += activeSegments[i].weight;
      const segment = activeSegments[Math.max(index, 0)];
      const midpoint = total ? (start + (segment?.weight ?? 0) / 2) / total * 360 : 0;
      const target = rotation + 6 * 360 + (360 - midpoint);
      setRotation(target);
      setRemaining(row.spins_remaining);
      setResult(row);
      setHistory(current => [{ id: row.spin_id, reward_label: row.reward_label, reward_coins: row.reward_coins, created_at: new Date().toISOString() }, ...current].slice(0, 5));
      onReward();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message.replaceAll('_', ' ') : 'Unable to spin right now.');
      setSpinning(false);
    }
  }

  return <section className="vd-spin-card" aria-label="Spin and Win">
    <div className="vd-spin-heading"><div><span className="vd-spin-eyebrow">DAILY REWARD</span><h2>Spin &amp; Win</h2><p>One exciting chance to earn bonus coins every day.</p></div><span className="vd-spin-count">{loading ? '…' : `${remaining} spins left`}</span></div>
    {!loading && !enabled && <div className="vd-spin-disabled"><b>Coming soon</b><span>Spin &amp; Win is being prepared. It will become available when the rewards team enables it.</span></div>}
    {loading && <p className="vd-spin-muted">Loading your reward wheel…</p>}
    {enabled && !loading && <div className="vd-spin-content">
      <div className="vd-wheel-wrap"><div className="vd-wheel-pointer"/><div className="vd-wheel" style={{ background: wheelBackground, transform: `rotate(${rotation}deg)` }} onTransitionEnd={() => setSpinning(false)}><div className="vd-wheel-labels">{activeSegments.map((s, i) => <span key={s.key} style={{ transform: `rotate(${(activeSegments.slice(0, i).reduce((sum, x) => sum + x.weight, 0) + s.weight / 2) / activeSegments.reduce((sum, x) => sum + x.weight, 0) * 360}deg) translateY(-${Math.min(105, 11 + activeSegments.length * 7)}px) rotate(90deg)` }}>{s.label}</span>)}</div><div className="vd-wheel-hub">VYRA</div></div></div>
      <button className="vd-spin-button" onClick={() => void spin()} disabled={spinning || remaining < 1}>{spinning ? 'Spinning…' : remaining < 1 ? 'Come back tomorrow' : 'SPIN NOW'}</button>
      {result && <div className="vd-spin-result" role="status"><b>{result.reward_label}</b><span>{result.reward_coins > 0 ? `${new Intl.NumberFormat().format(result.reward_coins)} coins have been added to your wallet.` : 'Better luck next time!'}</span></div>}
    </div>}
    {message && <p className="vd-spin-error" role="alert">{message}</p>}
    {history.length > 0 && <div className="vd-spin-history"><h3>Recent spins</h3>{history.map(item => <div key={item.id}><span>{item.reward_label}<small>{new Date(item.created_at).toLocaleString()}</small></span><b>{new Intl.NumberFormat().format(item.reward_coins)} coins</b></div>)}</div>}
  </section>;
}
