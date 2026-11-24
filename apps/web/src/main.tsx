import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider, AuthScreen, PasswordRecoveryRoute, useAuth } from './auth';
import { supabaseConfigured } from './lib/supabase';
import './auth/auth.css';
import { Dashboard } from './dashboard/Dashboard';
import { EarnCenter } from './earn/EarnCenter';
import { WithdrawalHistory } from './withdrawals/WithdrawalHistory';
import { ReferralCenter } from './referrals/ReferralCenter';
import { DailyCheckin } from './checkins/DailyCheckin';
import { MemberCareCenter } from './member-care/MemberCareCenter';
import { CountrySelection } from './country/CountrySelection';

function App() {
  const [page, setPage] = React.useState<'dashboard' | 'earn' | 'withdrawals' | 'referrals' | 'checkin' | 'care'>(window.location.pathname === '/earn' ? 'earn' : window.location.pathname === '/withdrawals' ? 'withdrawals' : window.location.pathname === '/referrals' ? 'referrals' : window.location.pathname === '/check-in' ? 'checkin' : window.location.pathname === '/support' ? 'care' : 'dashboard');
  const { user, profile, loading, profileError, logout, refreshProfile } = useAuth();
  if (loading) return <main className="vyra-auth-shell">Loading account…</main>;
  if (!user) return <AuthScreen />;
  if (profileError) return <main className="vyra-auth-shell"><section className="vyra-auth-card"><h1>Account profile unavailable</h1><p>{profileError}</p><button onClick={() => void logout()}>Sign out</button></section></main>;
  if (!profile?.country_code) return <CountrySelection onSelected={refreshProfile} onSignOut={() => void logout()} />;
  if (page === 'earn') return <EarnCenter email={user.email} />;
  if (page === 'withdrawals') return <WithdrawalHistory onBack={() => { window.history.pushState({}, '', '/'); setPage('dashboard'); }} />;
  if (page === 'referrals') return <ReferralCenter profile={profile} onBack={() => { window.history.pushState({}, '', '/'); setPage('dashboard'); }} />;
  if (page === 'checkin') return <DailyCheckin onBack={() => { window.history.pushState({}, '', '/'); setPage('dashboard'); }} />;
  if (page === 'care') return <MemberCareCenter onBack={() => { window.history.pushState({}, '', '/'); setPage('dashboard'); }} />;
  return <Dashboard profile={profile} email={user.email} onSignOut={() => void logout()} onEarn={() => { window.history.pushState({}, '', '/earn'); setPage('earn'); }} onWithdrawals={() => { window.history.pushState({}, '', '/withdrawals'); setPage('withdrawals'); }} onReferrals={() => { window.history.pushState({}, '', '/referrals'); setPage('referrals'); }} onCheckin={() => { window.history.pushState({}, '', '/check-in'); setPage('checkin'); }} onSupport={() => { window.history.pushState({}, '', '/support'); setPage('care'); }} />;
}

function Root() {
  if (!supabaseConfigured) return <main className="vyra-auth-shell"><section className="vyra-auth-card"><h1>Configuration required</h1><p>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before starting the web app.</p></section></main>;
  const isRecovery = window.location.pathname === '/reset-password';
  return <AuthProvider>{isRecovery ? <PasswordRecoveryRoute /> : <App />}</AuthProvider>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Root /></React.StrictMode>);
