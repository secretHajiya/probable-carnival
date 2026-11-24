import { requireSupabase } from '../lib/supabase';

export type QuizQuestion = {
  attempt_id: string;
  question_key: string;
  question_text: string;
  options: string[];
  attempts_remaining: number;
  reward_per_correct: number;
};

export type QuizAnswerResult = {
  is_correct: boolean;
  reward_coins: number;
  explanation: string | null;
  attempts_remaining: number;
  available_coins: number;
};

function firstRow<T>(data: unknown): T {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') throw new Error('The quiz service returned an invalid response.');
  return row as T;
}

export const quizService = {
  async getQuestion(): Promise<QuizQuestion> {
    const { data, error } = await requireSupabase().rpc('get_quiz_question');
    if (error) throw new Error(error.message || 'Quiz is currently unavailable.');
    const row = firstRow<QuizQuestion>(data);
    if (typeof row.attempt_id !== 'string' || !Array.isArray(row.options)) {
      throw new Error('The quiz question response is incomplete.');
    }
    return { ...row, options: row.options.map(String) };
  },

  async submitAnswer(attemptId: string, selectedOption: string): Promise<QuizAnswerResult> {
    if (!attemptId || !selectedOption.trim()) throw new Error('Please choose an answer.');
    const { data, error } = await requireSupabase().rpc('submit_quiz_answer', {
      p_attempt_id: attemptId,
      p_selected_option: selectedOption,
    });
    if (error) throw new Error(error.message || 'Your answer could not be submitted.');
    const row = firstRow<QuizAnswerResult>(data);
    if (typeof row.is_correct !== 'boolean' || typeof row.reward_coins !== 'number') {
      throw new Error('The quiz result response is incomplete.');
    }
    return row;
  },
};
