import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Linking, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View, RefreshControl } from 'react-native';
import { DirectionalText as Text, DirectionalTextInput as TextInput, DirectionProvider, isRTL } from './src/components/DirectionProvider';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from './src/lib/supabase';
import { authService } from './src/services/auth.service';
import { memberService } from './src/services/member.service';
import { cpxService } from './src/services/cpx.service';
import { SpinWheelPanel } from './src/components/SpinWheelPanel';
import { QuizRewardsPanel } from './src/components/QuizRewardsPanel';
import { DailyCheckinPanel } from './src/components/DailyCheckinPanel';
import { RewardedAdsPanel } from './src/components/RewardedAdsPanel';
import { LevelPlayBannerPanel } from './src/components/LevelPlayBannerPanel';
import { ReferralCenterPanel } from './src/components/ReferralCenterPanel';
import { ActivityHistoryPanel } from './src/components/ActivityHistoryPanel';
import { MemberInboxPanel } from './src/components/MemberInboxPanel';
import { WithdrawalCenterPanel } from './src/components/WithdrawalCenterPanel';
import { ProfileSettingsPanel } from './src/components/ProfileSettingsPanel';
import { t } from './src/services/i18n';
import type { MemberLanguage } from './src/services/profile-settings.service';
import { levelPlayRewardedService } from './src/services/levelplay-rewarded.service';
import type { MemberProfile, WalletAccount, SupportedCountry } from './src/types/domain';

type Tab = 'Home' | 'Earn' | 'Activity' | 'Referrals' | 'Withdrawals' | 'Inbox' | 'Profile';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [wallet, setWallet] = useState<WalletAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'login' | 'register' | 'otp'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [country, setCountry] = useState<SupportedCountry>('NG');
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<Tab>('Home');
  const [cpxBusy, setCpxBusy] = useState(false);
  const [cpxMessage, setCpxMessage] = useState('');
  const language = (profile?.preferred_language || 'en') as MemberLanguage;
  const tr = (key: Parameters<typeof t>[1]) => t(language, key);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => { if (mounted) setSession(data.session); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && session?.user) void refreshMember(false);
    });
    return () => subscription.remove();
  }, [session?.user?.id]);

  async function openCpxSurvey() {
    setCpxBusy(true); setCpxMessage('');
    try {
      const url = await cpxService.getAndroidOfferwallUrl();
      await Linking.openURL(url);
    } catch (e) {
      setCpxMessage(e instanceof Error ? e.message : 'Unable to open CPX Research.');
    } finally { setCpxBusy(false); }
  }

  async function refreshMember(showSpinner = false) {
    if (!session?.user) return;
    if (showSpinner) setRefreshing(true);
    try {
      const snapshot = await memberService.getSnapshot(session.user.id);
      setProfile(snapshot.profile); setWallet(snapshot.wallet); setMessage('');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not refresh your account.'); }
    finally { setRefreshing(false); setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      if (!session?.user) { setProfile(null); setWallet(null); setLoading(false); return; }
      setLoading(true);
      try { const snapshot = await memberService.getSnapshot(session.user.id); if (active) { setProfile(snapshot.profile); setWallet(snapshot.wallet); } }
      catch (e) { if (active) setMessage(e instanceof Error ? e.message : 'Could not load your account.'); }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, [session]);

  async function submitAuth() {
    setBusy(true); setMessage('');
    try {
      if (mode === 'register') { const next = await authService.register(name, email, password); if (next) setSession(next); else setMode('otp'); }
      else if (mode === 'otp') setSession(await authService.verifySignupOtp(email, otp));
      else setSession(await authService.signIn(email, password));
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Authentication failed.'); }
    finally { setBusy(false); }
  }
  async function chooseCountry() {
    setBusy(true); setMessage('');
    try { const updated = await memberService.setCountry(country); setProfile(updated); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save country.'); }
    finally { setBusy(false); }
  }
  async function signOut() { await authService.signOut(); setSession(null); setProfile(null); setWallet(null); setTab('Home'); }

  if (!supabaseConfigured) return <Shell rtl={isRTL(language)}><Text style={s.brand}>VYRA REWARDS GLOBAL</Text><Text style={s.heading}>{tr('configuration')}</Text><Text style={s.body}>{tr('configHelp')}</Text></Shell>;
  if (loading) return <Shell rtl={isRTL(language)}><ActivityIndicator size="large" color="#5558E8"/><Text style={s.body}>{tr('loading')}</Text></Shell>;
  if (!session) return <Shell rtl={isRTL(language)}>
    <View style={s.authMark}><Text style={s.authMarkText}>V</Text></View><Text style={s.brand}>VYRA REWARDS GLOBAL</Text><Text style={s.heading}>{mode === 'otp' ? tr('verifyEmail') : mode === 'register' ? tr('createAccount') : tr('welcome')}</Text><Text style={s.body}>{tr('journey')}</Text>
    {mode === 'register' && <Field label={tr('fullName')} value={name} onChangeText={setName}/>}
    <Field label={tr('email')} value={email} onChangeText={setEmail} keyboardType="email-address"/>
    {mode !== 'otp' && <Field label={tr('password')} value={password} onChangeText={setPassword} secureTextEntry/>}
    {mode === 'otp' && <Field label={tr('otp')} value={otp} onChangeText={setOtp} keyboardType="number-pad"/>}
    {!!message && <Text style={s.error}>{message}</Text>}
    <Primary label={busy ? tr('pleaseWait') : mode === 'otp' ? tr('verify') : mode === 'register' ? tr('createAccount') : tr('signIn')} onPress={submitAuth} disabled={busy}/>
    <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(''); }}><Text style={s.link}>{mode === 'login' ? tr('createNew') : tr('alreadyHave')}</Text></TouchableOpacity>
  </Shell>;
  if (!profile?.country_code) return <Shell rtl={isRTL(language)}><Text style={s.brand}>VYRA REWARDS GLOBAL</Text><Text style={s.heading}>{tr('chooseCountry')}</Text><Text style={s.body}>{tr('countryHelp')}</Text><View style={s.row}><Primary label={tr('nigeria')} onPress={() => setCountry('NG')} selected={country === 'NG'}/><Primary label={tr('usa')} onPress={() => setCountry('US')} selected={country === 'US'}/></View>{!!message && <Text style={s.error}>{message}</Text>}<Primary label={busy ? tr('saving') : tr('continue')} onPress={chooseCountry} disabled={busy}/></Shell>;

  const firstName = (profile.display_name || 'Member').trim().split(/\s+/)[0];
  return <DirectionProvider rtl={isRTL(language)}><SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.dashboard} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refreshMember(true)} tintColor="#5558E8"/>}>
      <View style={s.topbar}><View><Text style={s.brand}>VYRA REWARDS</Text><Text style={s.greeting}>{tr('greeting')}, {firstName} 👋</Text></View><View style={s.countryPill}><Text style={s.countryText}>{profile.country_code}</Text></View></View>
      {tab === 'Home' && <>
        <View style={s.balance}><View style={s.balanceTop}><Text style={s.balanceLabel}>{tr('availableCoins')}</Text><Text style={s.coinIcon}>✦</Text></View><Text style={s.balanceValue}>{wallet ? wallet.available_coins.toLocaleString() : tr('unavailable')}</Text><Text style={s.balanceFoot}>{tr('rewardsBalance')}</Text><View style={s.balanceDivider}/><View style={s.balanceStats}><View><Text style={s.statLabel}>{tr('pending')}</Text><Text style={s.statValue}>{wallet ? wallet.pending_coins.toLocaleString() : '—'}</Text></View><View><Text style={s.statLabel}>{tr('lifetime')}</Text><Text style={s.statValue}>{wallet ? wallet.lifetime_earned_coins.toLocaleString() : '—'}</Text></View></View></View>
        <View style={s.sectionRow}><Text style={s.section}>{tr('explore')}</Text><Text style={s.sectionHint}>{tr('chooseActivity')}</Text></View>
        <View style={s.tiles}><Tile icon="◉" title={tr('surveys')} subtitle={tr('earnSurveys')} tint="#E9EAFE" onPress={() => setTab('Earn')}/><Tile icon="◎" title={tr('spin')} subtitle={tr('dailyWheel')} tint="#FFF0D9" onPress={() => setTab('Earn')}/><Tile icon="✎" title={tr('quiz')} subtitle={tr('testKnowledge')} tint="#E2F6EE" onPress={() => setTab('Earn')}/><Tile icon="♧" title={tr('dailyCheckin')} subtitle={tr('buildStreak')} tint="#FCE8EF" onPress={() => setTab('Earn')}/><Tile icon="↗" title={tr('inviteFriends')} subtitle={tr('referralCenter')} tint="#E8F3FF" onPress={() => setTab('Referrals')}/><Tile icon="↧" title={tr('withdrawals')} subtitle={tr('historyStatus')} tint="#E9F5F0" onPress={() => setTab('Withdrawals')}/><Tile icon="✉" title={tr('inboxSupport')} subtitle={tr('notificationsHelp')} tint="#F0EAFE" onPress={() => setTab('Inbox')}/></View>
        <View style={s.notice}><Text style={s.noticeTitle}>{tr('moreWays')}</Text><Text style={s.noticeBody}>{tr('secureRewards')}</Text></View>
      </>}
      {tab === 'Earn' && <><Text style={s.pageTitle}>{tr('earnCoins')}</Text><Text style={s.body}>{tr('earnHelp')}</Text><View style={s.cpxCard}><View style={s.cpxHeader}><View style={s.cpxMark}><Text style={s.cpxMarkText}>◉</Text></View><View style={{flex:1}}><Text style={s.listTitle}>{tr('cpxTitle')}</Text><Text style={s.listSub}>{tr('cpxHelp')}</Text></View></View><Primary label={cpxBusy ? tr('preparingSurvey') : tr('openSurvey')} onPress={openCpxSurvey} disabled={cpxBusy}/>{!!cpxMessage && <Text style={s.error}>{cpxMessage}</Text>}<Text style={s.cpxFoot}>{tr('cpxUnavailable')}</Text></View><SpinWheelPanel language={language} onWalletRefresh={() => { if (session?.user) void refreshMember(false); }} /><QuizRewardsPanel language={language} onWalletRefresh={() => { if (session?.user) void refreshMember(false); }} /><DailyCheckinPanel language={language} onWalletRefresh={() => { if (session?.user) void refreshMember(false); }} /><RewardedAdsPanel userId={session.user.id} language={language} onWalletRefresh={() => { if (session?.user) void refreshMember(false); }} /><LevelPlayBannerPanel userId={session.user.id} language={language} /></>}
      {tab === 'Referrals' && <ReferralCenterPanel userId={session.user.id} language={language} />}
      {tab === 'Activity' && <ActivityHistoryPanel userId={session.user.id} language={language} />}
      {tab === 'Inbox' && <MemberInboxPanel userId={session.user.id} language={language} />}
      {tab === 'Withdrawals' && <WithdrawalCenterPanel userId={session.user.id} language={language} />}
      {tab === 'Profile' && <ProfileSettingsPanel profile={profile} email={session.user.email || ''} onSaved={setProfile} onSignOut={signOut}/> }
      {!!message && <Text style={s.error}>{message}</Text>}
      <Text style={s.footer}>{tr('secureFooter')}</Text>
    </ScrollView>
    <View style={s.nav}>{(['Home','Earn','Activity','Referrals','Withdrawals','Inbox','Profile'] as Tab[]).map((item, i) => <TouchableOpacity key={item} style={s.navItem} onPress={() => { if (tab === 'Earn' && item !== 'Earn' && session?.user) void levelPlayRewardedService.maybeShowInterstitial(session.user.id); setTab(item); setMessage(''); }}><Text style={[s.navIcon, tab === item && s.navActive]}>{['⌂','✦','◷','↗','↧','✉','○'][i]}</Text><Text style={[s.navLabel, tab === item && s.navActive]}>{item === 'Home' ? tr('home') : item === 'Earn' ? tr('earn') : item === 'Activity' ? tr('activity') : item === 'Referrals' ? tr('referralCenter') : item === 'Withdrawals' ? tr('payouts') : item === 'Inbox' ? tr('inboxSupport') : tr('profile')}</Text></TouchableOpacity>)}</View>
  </SafeAreaView></DirectionProvider>;
}
function Shell({children,rtl=false}:{children:React.ReactNode;rtl?:boolean}) { return <DirectionProvider rtl={rtl}><SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>{children}</ScrollView></SafeAreaView></DirectionProvider>; }
function Field(p:{label:string;value:string;onChangeText:(v:string)=>void;secureTextEntry?:boolean;keyboardType?:'default'|'email-address'|'number-pad'}) { return <View style={s.field}><Text style={s.label}>{p.label}</Text><TextInput style={s.input} value={p.value} onChangeText={p.onChangeText} secureTextEntry={p.secureTextEntry} keyboardType={p.keyboardType||'default'} autoCapitalize="none" autoCorrect={false}/></View>; }
function Primary(p:{label:string;onPress:()=>void;disabled?:boolean;selected?:boolean}) { return <TouchableOpacity disabled={p.disabled} onPress={p.onPress} style={[s.button,p.selected&&s.buttonSelected,p.disabled&&s.disabled]}><Text style={s.buttonText}>{p.label}</Text></TouchableOpacity>; }
function Tile(p:{icon:string;title:string;subtitle:string;tint:string;onPress:()=>void}) { return <TouchableOpacity style={s.tile} onPress={p.onPress}><View style={[s.tileIcon,{backgroundColor:p.tint}]}><Text style={s.tileIconText}>{p.icon}</Text></View><Text style={s.tileTitle}>{p.title}</Text><Text style={s.tileSub}>{p.subtitle}</Text></TouchableOpacity>; }
function Info(p:{label:string;value:string}) { return <View style={s.infoRow}><Text style={s.infoLabel}>{p.label}</Text><Text style={s.infoValue}>{p.value}</Text></View>; }
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#F5F6FC'},content:{flexGrow:1,padding:24,justifyContent:'center',gap:14},dashboard:{padding:20,paddingBottom:28,gap:18},authMark:{width:54,height:54,borderRadius:17,backgroundColor:'#5558E8',alignItems:'center',justifyContent:'center'},authMarkText:{fontSize:28,fontWeight:'900',color:'#FFF'},brand:{color:'#5558E8',fontWeight:'900',letterSpacing:1.5,fontSize:12},heading:{color:'#171A35',fontSize:28,fontWeight:'800',marginTop:5},body:{color:'#737A91',fontSize:13,lineHeight:20},field:{gap:7,marginTop:7},label:{color:'#313750',fontWeight:'700',fontSize:13},input:{backgroundColor:'#FFF',borderColor:'#DDE1EF',borderWidth:1,borderRadius:12,paddingHorizontal:14,paddingVertical:13,color:'#171A31'},button:{backgroundColor:'#5558E8',borderRadius:13,padding:15,alignItems:'center',marginTop:8,flex:1},buttonSelected:{backgroundColor:'#292C9A'},disabled:{opacity:.6},buttonText:{color:'#FFF',fontWeight:'800'},link:{textAlign:'center',color:'#5558E8',fontWeight:'700',padding:12},error:{color:'#B42318',fontSize:13},row:{flexDirection:'row',gap:10},topbar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:2},greeting:{color:'#171A35',fontSize:23,fontWeight:'900',marginTop:5},countryPill:{backgroundColor:'#E9EAFE',paddingHorizontal:14,paddingVertical:8,borderRadius:20},countryText:{color:'#4447C8',fontWeight:'900',fontSize:12},balance:{backgroundColor:'#191B59',borderRadius:22,padding:21,gap:7},balanceTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},balanceLabel:{color:'#C9CAFF',fontSize:10,fontWeight:'900',letterSpacing:1.2},coinIcon:{color:'#F8D77A',fontSize:22},balanceValue:{color:'#FFF',fontSize:36,fontWeight:'900',marginTop:3},balanceFoot:{color:'#C5C7F5',fontSize:12},balanceDivider:{height:1,backgroundColor:'#45477F',marginVertical:10},balanceStats:{flexDirection:'row',justifyContent:'space-between'},statLabel:{color:'#BFC1F1',fontSize:9,fontWeight:'800',letterSpacing:1},statValue:{color:'#FFF',fontSize:16,fontWeight:'800',marginTop:4},sectionRow:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between'},section:{color:'#191C38',fontSize:17,fontWeight:'900'},sectionHint:{color:'#9298AC',fontSize:11},tiles:{flexDirection:'row',flexWrap:'wrap',gap:11},tile:{width:'48%',backgroundColor:'#FFF',borderRadius:16,padding:14,borderWidth:1,borderColor:'#EAECF4',gap:5},tileIcon:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center',marginBottom:4},tileIconText:{fontSize:20,color:'#3437B6',fontWeight:'900'},tileTitle:{color:'#222641',fontWeight:'900',fontSize:14},tileSub:{color:'#8A90A4',fontSize:11},notice:{backgroundColor:'#EEF0FF',borderRadius:15,padding:15,gap:6},noticeTitle:{color:'#383BAA',fontWeight:'900',fontSize:13},noticeBody:{color:'#646A91',fontSize:11,lineHeight:17},pageTitle:{color:'#191C38',fontSize:25,fontWeight:'900'},cpxCard:{backgroundColor:'#FFF',borderRadius:17,padding:16,gap:10,borderWidth:1,borderColor:'#E6E8F3'},cpxHeader:{flexDirection:'row',alignItems:'center',gap:12},cpxMark:{width:42,height:42,borderRadius:14,backgroundColor:'#E9EAFE',alignItems:'center',justifyContent:'center'},cpxMarkText:{fontSize:22,color:'#5558E8',fontWeight:'900'},cpxFoot:{color:'#9298AC',fontSize:10,lineHeight:15},listCard:{backgroundColor:'#FFF',borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:'#EAECF4'},listIcon:{width:40,height:40,borderRadius:13,backgroundColor:'#EEF0FF',alignItems:'center',justifyContent:'center'},listIconText:{color:'#5558E8',fontSize:20},listTitle:{color:'#242743',fontWeight:'800',fontSize:13},listSub:{color:'#858BA0',fontSize:10,marginTop:4},soon:{fontSize:9,color:'#8C7130',fontWeight:'900'},empty:{backgroundColor:'#FFF',borderRadius:18,padding:24,alignItems:'center',gap:10,marginTop:8},emptyIcon:{fontSize:35,color:'#777AE8'},emptyTitle:{fontSize:16,fontWeight:'900',color:'#242743'},profileCard:{backgroundColor:'#FFF',borderRadius:18,padding:22,alignItems:'center',gap:7},avatar:{width:62,height:62,borderRadius:22,backgroundColor:'#E9EAFE',alignItems:'center',justifyContent:'center'},avatarText:{color:'#4B4ED4',fontSize:27,fontWeight:'900'},profileName:{color:'#222641',fontWeight:'900',fontSize:17},profileEmail:{color:'#858BA0',fontSize:12},infoCard:{backgroundColor:'#FFF',borderRadius:15,paddingHorizontal:15},infoRow:{paddingVertical:15,borderBottomWidth:1,borderBottomColor:'#EFF0F5',flexDirection:'row',justifyContent:'space-between'},infoLabel:{color:'#858BA0',fontSize:12},infoValue:{color:'#272A45',fontWeight:'800',fontSize:12},nav:{height:68,backgroundColor:'#FFF',borderTopWidth:1,borderTopColor:'#E9EAF2',flexDirection:'row',justifyContent:'space-around',alignItems:'center'},navItem:{alignItems:'center',justifyContent:'center',gap:3,flex:1},navIcon:{fontSize:21,color:'#9A9FB0'},navLabel:{fontSize:10,color:'#9A9FB0',fontWeight:'700'},navActive:{color:'#5558E8'},footer:{color:'#A0A5B5',fontSize:10,textAlign:'center',marginTop:5}});
