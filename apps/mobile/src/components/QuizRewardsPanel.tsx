import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { DirectionalText as Text } from './DirectionProvider';
import { quizService, type QuizAnswerResult, type QuizQuestion } from '../services/quiz.service';
import { sqa } from '../services/spin-quiz-ads-i18n';
import type { MemberLanguage } from '../services/profile-settings.service';

type Props = { onWalletRefresh: () => void; language: MemberLanguage };

export function QuizRewardsPanel({ onWalletRefresh, language }: Props) {
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState<QuizAnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [unavailable, setUnavailable] = useState(false);

  async function loadQuestion() {
    setBusy(true); setNotice(''); setResult(null); setSelected(''); setUnavailable(false);
    try { setQuestion(await quizService.getQuestion()); }
    catch (e) {
      setQuestion(null);
      const message = e instanceof Error ? e.message : sqa(language, 'quizUnavailable');
      setNotice(message);
      setUnavailable(message.toLowerCase().includes('quiz_disabled'));
    } finally { setBusy(false); }
  }

  async function submit() {
    if (!question || !selected || busy) return;
    setBusy(true); setNotice('');
    try {
      const answer = await quizService.submitAnswer(question.attempt_id, selected);
      setResult(answer);
      if (answer.is_correct && answer.reward_coins > 0) onWalletRefresh();
    } catch (e) { setNotice(e instanceof Error ? e.message : sqa(language, 'submitFailed')); }
    finally { setBusy(false); }
  }

  return <View style={s.card}>
    <View style={s.header}><View style={s.icon}><Text style={s.iconText}>?</Text></View><View style={{flex:1}}><Text style={s.title}>{sqa(language, 'quizTitle')}</Text><Text style={s.sub}>{sqa(language, 'quizSubtitle')}</Text></View></View>
    {!question && <><Text style={s.note}>{sqa(language, 'quizSafety')}</Text><TouchableOpacity style={[s.button,busy&&s.disabled]} onPress={loadQuestion} disabled={busy}><Text style={s.buttonText}>{busy ? sqa(language, 'checkingQuiz') : sqa(language, 'startQuiz')}</Text></TouchableOpacity></>}
    {question && <>
      <View style={s.meta}><Text style={s.metaText}>{question.attempts_remaining} {sqa(language, 'attemptsRemaining')}</Text><Text style={s.metaText}>{sqa(language, 'upTo')} {question.reward_per_correct} {sqa(language, 'coins')}</Text></View>
      <Text style={s.question}>{question.question_text}</Text>
      {question.options.map((option) => <TouchableOpacity key={option} onPress={() => !result && setSelected(option)} disabled={!!result || busy} style={[s.option,selected===option&&s.optionSelected]}><View style={[s.radio,selected===option&&s.radioSelected]}/><Text style={s.optionText}>{option}</Text></TouchableOpacity>)}
      {!result && <TouchableOpacity style={[s.button,(!selected||busy)&&s.disabled]} onPress={submit} disabled={!selected||busy}><Text style={s.buttonText}>{busy ? sqa(language, 'submitting') : sqa(language, 'submitAnswer')}</Text></TouchableOpacity>}
      {result && <View style={s.result}><Text style={s.resultTitle}>{result.is_correct ? sqa(language, 'correct', { coins: result.reward_coins }) : sqa(language, 'incorrect')}</Text>{!!result.explanation && <Text style={s.explanation}>{result.explanation}</Text>}<Text style={s.note}>{result.attempts_remaining} {sqa(language, 'attemptsRemainingToday')}</Text><TouchableOpacity style={s.button} onPress={loadQuestion} disabled={busy}><Text style={s.buttonText}>{result.attempts_remaining > 0 ? sqa(language, 'nextQuestion') : sqa(language, 'checkAgain')}</Text></TouchableOpacity></View>}
    </>}
    {!!notice && <Text style={s.error}>{unavailable ? sqa(language, 'quizDisabled') : notice}</Text>}
  </View>;
}

const s=StyleSheet.create({card:{backgroundColor:'#FFF',borderRadius:17,padding:16,gap:11,borderWidth:1,borderColor:'#E6E8F3'},header:{flexDirection:'row',alignItems:'center',gap:12},icon:{width:42,height:42,borderRadius:14,backgroundColor:'#E2F6EE',alignItems:'center',justifyContent:'center'},iconText:{fontSize:23,fontWeight:'900',color:'#16734A'},title:{fontSize:14,fontWeight:'900',color:'#242743'},sub:{fontSize:10,color:'#858BA0',marginTop:3},note:{fontSize:10,color:'#777E94',lineHeight:16},button:{backgroundColor:'#5558E8',borderRadius:12,padding:14,alignItems:'center'},buttonText:{color:'#FFF',fontWeight:'800',fontSize:12},disabled:{opacity:.5},meta:{flexDirection:'row',justifyContent:'space-between'},metaText:{fontSize:10,color:'#686F86',fontWeight:'700'},question:{fontSize:16,fontWeight:'900',color:'#202440',lineHeight:23},option:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:11,borderWidth:1,borderColor:'#E6E8F3'},optionSelected:{borderColor:'#5558E8',backgroundColor:'#F0F0FF'},radio:{width:16,height:16,borderRadius:8,borderWidth:1.5,borderColor:'#A5A9B9'},radioSelected:{borderColor:'#5558E8',backgroundColor:'#5558E8'},optionText:{fontSize:12,color:'#303550',flex:1},result:{backgroundColor:'#F2F8F4',borderRadius:12,padding:12,gap:8},resultTitle:{fontSize:14,fontWeight:'900',color:'#176B45'},explanation:{fontSize:11,color:'#52645A',lineHeight:17},error:{fontSize:11,color:'#B42318',lineHeight:16}});
