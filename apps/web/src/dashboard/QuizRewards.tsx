import { useCallback, useEffect, useState } from 'react';
import { requireSupabase } from '../lib/supabase';
import './quiz-rewards.css';

type QuizQuestion = { attempt_id: string; question_key: string; question_text: string; options: unknown; attempts_remaining: number };
type QuizResult = { is_correct: boolean; reward_coins: number; explanation: string | null; attempts_remaining: number; available_balance?: number };
function parseOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => typeof item === 'string' ? item : item && typeof item === 'object' && 'label' in item ? String((item as {label: unknown}).label) : '').filter(Boolean);
}
export function QuizRewards({ onReward }: { onReward: () => void }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(0);
  const options = parseOptions(question?.options);

  const load = useCallback(async () => {
    setLoading(true); setError(''); setResult(null); setQuestion(null); setSelected('');
    try {
      const { data, error: questionError } = await requireSupabase().rpc('get_quiz_question');
      if (questionError) {
        const message = questionError.message || '';
        if (/quiz.*(disabled|not enabled)|not enabled.*quiz/i.test(message)) { setEnabled(false); setRemaining(0); return; }
        throw questionError;
      }
      const row = (Array.isArray(data) ? data[0] : data) as QuizQuestion | null;
      if (!row) { setEnabled(true); setRemaining(0); return; }
      setEnabled(true); setQuestion(row); setRemaining(Number(row.attempts_remaining ?? 0));
    } catch (cause) { setError(cause instanceof Error ? cause.message.replaceAll('_', ' ') : 'Unable to load Quiz Rewards.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit() {
    if (!question || !selected || busy) return;
    setBusy(true); setError('');
    try {
      const { data, error: submitError } = await requireSupabase().rpc('submit_quiz_answer', { p_attempt_id: question.attempt_id, p_selected_option: selected });
      if (submitError) throw submitError;
      const row = (Array.isArray(data) ? data[0] : data) as QuizResult | null;
      if (!row) throw new Error('Quiz service returned no result.');
      setResult(row); setRemaining(Number(row.attempts_remaining ?? 0));
      if (row.is_correct) onReward();
    } catch (cause) { setError(cause instanceof Error ? cause.message.replaceAll('_', ' ') : 'Unable to submit your answer.'); }
    finally { setBusy(false); }
  }

  return <section className="vd-quiz-card" aria-label="Quiz Rewards">
    <div className="vd-quiz-head"><div><span className="vd-quiz-eyebrow">KNOWLEDGE REWARDS</span><h2>Quiz Rewards</h2><p>Answer questions correctly and earn coins.</p></div><span className="vd-quiz-count">{loading ? '…' : `${remaining} attempts left`}</span></div>
    {loading && <p className="vd-quiz-muted">Loading your quiz…</p>}
    {!loading && !enabled && <div className="vd-quiz-disabled"><b>Coming soon</b><span>Quiz Rewards will be available when the rewards team enables the feature.</span></div>}
    {!loading && enabled && question && !result && <div className="vd-quiz-body"><h3>{question.question_text}</h3><div className="vd-quiz-options">{options.map((option, index) => <label key={`${index}-${option}`} className={selected === option ? 'selected' : ''}><input type="radio" name="vyra-quiz-answer" value={option} checked={selected === option} onChange={() => setSelected(option)} /><span>{option}</span></label>)}</div><button className="vd-quiz-submit" disabled={!selected || busy} onClick={() => void submit()}>{busy ? 'Checking answer…' : 'Submit answer'}</button></div>}
    {!loading && enabled && !question && !error && <div className="vd-quiz-disabled"><b>No more questions right now</b><span>You have used your available questions for now, or the question bank needs more questions.</span><button onClick={() => void load()}>Check again</button></div>}
    {result && <div className={`vd-quiz-result ${result.is_correct ? 'correct' : 'incorrect'}`} role="status"><b>{result.is_correct ? `Correct! +${new Intl.NumberFormat().format(result.reward_coins)} coins` : 'Not quite — try the next question'}</b>{result.explanation && <p>{result.explanation}</p>}<button onClick={() => void load()} disabled={busy || remaining <= 0}>{remaining > 0 ? 'Next question' : 'No attempts left today'}</button></div>}
    {error && <p className="vd-quiz-error" role="alert">{error}</p>}
  </section>;
}
