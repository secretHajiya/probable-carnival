import React from 'react';
import { requireSupabase } from '../../lib/supabase';

type Question = { question_key: string; question_text: string; options: string[]; correct_option: string; explanation: string; is_active: boolean };
type Config = { is_enabled: boolean; daily_attempt_limit: number; reward_coins: number };
const emptyQuestion = (): Question => ({ question_key: `quiz_${Date.now()}`, question_text: '', options: ['', '', '', ''], correct_option: '', explanation: '', is_active: true });
function normalizeQuestions(value: unknown): Question[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const q = item as Partial<Question>;
    return { question_key: String(q.question_key ?? `question_${index + 1}`), question_text: String(q.question_text ?? ''), options: Array.isArray(q.options) ? q.options.map(String) : ['', '', '', ''], correct_option: String(q.correct_option ?? ''), explanation: String(q.explanation ?? ''), is_active: q.is_active !== false };
  });
}
export function AdminQuizRewards({ onBack }: { onBack: () => void }) {
  const [config, setConfig] = React.useState<Config | null>(null);
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const load = React.useCallback(async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const db = requireSupabase();
      const [c, q] = await Promise.all([
        db.from('quiz_config').select('is_enabled,daily_attempt_limit,reward_coins').eq('id', true).single(),
        db.from('quiz_questions').select('question_key,question_text,options,correct_option,explanation,is_active').order('created_at', { ascending: false }),
      ]);
      if (c.error) throw c.error; if (q.error) throw q.error;
      setConfig({ is_enabled: Boolean(c.data.is_enabled), daily_attempt_limit: Number(c.data.daily_attempt_limit), reward_coins: Number(c.data.reward_coins) });
      setQuestions(normalizeQuestions(q.data));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load Quiz Rewards settings.'); }
    finally { setBusy(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  function updateQuestion(index: number, patch: Partial<Question>) { setQuestions(current => current.map((q, i) => i === index ? { ...q, ...patch } : q)); }
  function updateOption(index: number, optionIndex: number, value: string) { setQuestions(current => current.map((q, i) => i === index ? { ...q, options: q.options.map((o, j) => j === optionIndex ? value : o) } : q)); }
  async function save() {
    if (!config) return;
    if (!Number.isInteger(config.daily_attempt_limit) || config.daily_attempt_limit < 1 || config.daily_attempt_limit > 20) { setError('Daily attempts must be between 1 and 20.'); return; }
    if (!Number.isInteger(config.reward_coins) || config.reward_coins < 0 || config.reward_coins > 1000000) { setError('Reward must be between 0 and 1,000,000 coins.'); return; }
    const active = questions.filter(q => q.is_active);
    if (active.length === 0) { setError('Add at least one active question before saving.'); return; }
    for (const q of active) {
      const opts = q.options.map(o => o.trim());
      if (!q.question_key.trim() || !q.question_text.trim() || opts.length < 2 || opts.some(o => !o) || new Set(opts).size !== opts.length || !opts.includes(q.correct_option) || !q.explanation.trim()) { setError(`Complete question “${q.question_key || 'untitled'}”: add unique options, select the correct option and provide an explanation.`); return; }
    }
    if (config.is_enabled && !window.confirm('Enable Quiz Rewards for members now? Confirm the question bank has been reviewed and tested.')) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const { error: rpcError } = await requireSupabase().rpc('admin_update_quiz_config', {
        p_is_enabled: config.is_enabled,
        p_daily_attempt_limit: config.daily_attempt_limit,
        p_reward_coins: config.reward_coins,
        p_questions: questions,
      });
      if (rpcError) throw rpcError;
      setNotice('Quiz Rewards settings saved successfully.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save Quiz Rewards settings.'); }
    finally { setSaving(false); }
  }
  return <section className="panel quiz-admin">
    <div className="section-head"><div><h2>Quiz Rewards control</h2><p>Manage member access, daily attempts, coin rewards and the question bank.</p></div><div className="head-actions"><button className="secondary" onClick={onBack}>Back</button><button className="secondary" onClick={() => void load()} disabled={busy || saving}>Refresh</button></div></div>
    {busy && <p>Loading Quiz Rewards settings…</p>}{error && <p className="error" role="alert">{error}</p>}{notice && <p className="success" role="status">{notice}</p>}
    {config && <>
      <div className="spin-admin-status"><div><span>Member access</span><strong>{config.is_enabled ? 'Enabled' : 'Disabled'}</strong><small>{config.is_enabled ? 'Members can answer quiz questions.' : 'Members cannot earn quiz rewards. Safe default.'}</small></div><label className="spin-toggle"><input type="checkbox" checked={config.is_enabled} onChange={e => setConfig(c => c ? { ...c, is_enabled: e.target.checked } : c)} /> Enable Quiz Rewards</label></div>
      <div className="settings-form quiz-general"><label>Daily attempts per member<input type="number" min="1" max="20" value={config.daily_attempt_limit} onChange={e => setConfig(c => c ? { ...c, daily_attempt_limit: Number(e.target.value) } : c)} /></label><label>Coins per correct answer<input type="number" min="0" max="1000000" value={config.reward_coins} onChange={e => setConfig(c => c ? { ...c, reward_coins: Number(e.target.value) } : c)} /></label></div>
      <div className="section-head quiz-bank-head"><div><h3>Question bank ({questions.length})</h3><p>Only active questions are shown to members. The correct answer stays in the database.</p></div><button className="secondary" onClick={() => setQuestions(current => [...current, emptyQuestion()])}>Add question</button></div>
      {questions.map((q, index) => <article className="quiz-question-editor" key={`${q.question_key}-${index}`}><div className="quiz-question-top"><strong>Question {index + 1}</strong><label><input type="checkbox" checked={q.is_active} onChange={e => updateQuestion(index, { is_active: e.target.checked })} /> Active</label><button className="danger" onClick={() => setQuestions(current => current.filter((_, i) => i !== index))}>Remove</button></div>
        <label>Question key<input value={q.question_key} maxLength={100} onChange={e => updateQuestion(index, { question_key: e.target.value })} /></label>
        <label>Question text<textarea rows={3} value={q.question_text} onChange={e => updateQuestion(index, { question_text: e.target.value })} /></label>
        <div className="quiz-option-grid">{q.options.map((option, optionIndex) => <label key={optionIndex}>Option {optionIndex + 1}<input value={option} onChange={e => updateOption(index, optionIndex, e.target.value)} /></label>)}</div>
        <label>Correct option<select value={q.correct_option} onChange={e => updateQuestion(index, { correct_option: e.target.value })}><option value="">Choose correct option</option>{q.options.filter(o => o.trim()).map(o => <option key={o} value={o}>{o}</option>)}</select></label>
        <label>Answer explanation<textarea rows={2} value={q.explanation} onChange={e => updateQuestion(index, { explanation: e.target.value })} /></label>
      </article>)}
      <div className="spin-save-row"><span className="muted">Settings are saved through the admin-only database function.</span><button onClick={() => void save()} disabled={saving || busy}>{saving ? 'Saving…' : 'Save Quiz Rewards settings'}</button></div>
      <p className="muted">Quiz Rewards remains disabled until an administrator explicitly enables it. This control does not change withdrawal settings.</p>
    </>}
  </section>;
}
