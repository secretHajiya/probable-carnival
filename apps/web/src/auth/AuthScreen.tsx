import { useState, type FormEvent } from 'react';
import { MEMBER_LOCALES, type MemberLocale } from '../i18n';
import { requestPasswordReset, signIn, signUp, updatePassword } from './authService';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';
export function AuthScreen({ onAuthenticated, initialMode = 'signin' }: { onAuthenticated?: () => void; initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState<MemberLocale>('en');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'signup') {
        const result = await signUp({ displayName: name, email, password, language });
        setMessage(result.needsEmailConfirmation ? 'Account created. Check your email and confirm your address before signing in.' : 'Account created successfully.');
        if (!result.needsEmailConfirmation) onAuthenticated?.();
      } else if (mode === 'signin') {
        await signIn(email, password); onAuthenticated?.();
      } else if (mode === 'forgot') {
        await requestPasswordReset(email, `${window.location.origin}/reset-password`);
        setMessage('If the address is registered, a password reset link has been sent.');
      } else {
        await updatePassword(password); setMessage('Password updated. You can continue using your account.'); setMode('signin'); setPassword('');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }

  const heading = mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : mode === 'reset' ? 'Choose a new password' : 'Welcome back';
  return <main className="vyra-auth-shell">
    <form className="vyra-auth-card" onSubmit={submit}>
      <p className="vyra-auth-brand">VYRA REWARDS GLOBAL</p><h1>{heading}</h1>
      {mode === 'signup' && <label>Display name<input autoComplete="name" value={name} onChange={e => setName(e.target.value)} required minLength={2} /></label>}
      {mode !== 'reset' && <label>Email address<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>}
      {mode !== 'forgot' && <label>{mode === 'reset' ? 'New password' : 'Password'}<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} /></label>}
      {mode === 'signup' && <label>Language<select value={language} onChange={e => setLanguage(e.target.value as MemberLocale)}>{MEMBER_LOCALES.map(x => <option key={x.code} value={x.code}>{x.label}</option>)}</select></label>}
      {error && <p role="alert" className="vyra-auth-error">{error}</p>}{message && <p role="status" className="vyra-auth-message">{message}</p>}
      <button disabled={busy} type="submit">{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Update password' : 'Sign in'}</button>
      <nav aria-label="Account actions">
        {mode === 'signin' && <><button type="button" className="vyra-auth-link" onClick={() => { setMode('forgot'); setMessage(''); setError(''); }}>Forgot password?</button><button type="button" className="vyra-auth-link" onClick={() => { setMode('signup'); setMessage(''); setError(''); }}>Create account</button></>}
        {mode !== 'signin' && <button type="button" className="vyra-auth-link" onClick={() => { setMode('signin'); setMessage(''); setError(''); }}>Back to sign in</button>}
      </nav>
    </form>
  </main>;
}

export function PasswordRecoveryRoute() {
  // Supabase PKCE recovery callback is parsed by the client; the reset form requires a valid recovery session.
  return <AuthScreen initialMode="reset" />;
}
