import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { requireSupabase } from '../lib/supabase';
import './member-care.css';

type Notice = { id: string; title: string; body: string; notification_type: string; action_path: string | null; read_at: string | null; created_at: string };
type Ticket = { id: string; subject: string; category: string; status: string; priority: string; created_at: string; updated_at: string };
type Message = { id: string; sender_user_id: string; sender_role: 'member' | 'admin'; message: string; created_at: string };
const categories = ['general', 'account', 'wallet', 'withdrawal', 'rewards', 'technical'];
const fmt = (value: string) => new Date(value).toLocaleString();

function explain(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'Something went wrong.');
  if (message.includes('authentication_required')) return 'Your session has expired. Please sign in again.';
  if (message.includes('ticket_not_available')) return 'This ticket is no longer open for replies.';
  return message;
}

export function MemberCareCenter({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<'notifications' | 'tickets'>('notifications');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [body, setBody] = useState('');
  const [reply, setReply] = useState('');
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const db = requireSupabase();
      const { data: auth, error: authError } = await db.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error('authentication_required');
      const [n, t] = await Promise.all([
        db.from('member_notifications').select('id,title,body,notification_type,action_path,read_at,created_at').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(50),
        db.from('support_tickets').select('id,subject,category,status,priority,created_at,updated_at').eq('user_id', auth.user.id).order('updated_at', { ascending: false }).limit(50),
      ]);
      if (n.error) throw n.error;
      if (t.error) throw t.error;
      setNotices((n.data || []) as Notice[]);
      setTickets((t.data || []) as Ticket[]);
    } catch (cause) { setError(explain(cause)); }
    finally { setLoading(false); }
  }, []);

  const loadMessages = useCallback(async (ticketId: string) => {
    if (!ticketId) { setMessages([]); return; }
    try {
      const { data, error: queryError } = await requireSupabase().from('support_messages').select('id,sender_user_id,sender_role,message,created_at').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      if (queryError) throw queryError;
      setMessages((data || []) as Message[]);
    } catch (cause) { setError(explain(cause)); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadMessages(selected); }, [selected, loadMessages]);

  const markRead = async (id: string) => {
    setError('');
    try {
      const { data, error: rpcError } = await requireSupabase().rpc('mark_notification_read', { p_notification_id: id });
      if (rpcError) throw rpcError;
      if (!data) throw new Error('Notification could not be marked as read.');
      setNotices(items => items.map(item => item.id === id ? { ...item, read_at: item.read_at || new Date().toISOString() } : item));
    } catch (cause) { setError(explain(cause)); }
  };

  const createTicket = async (event: FormEvent) => {
    event.preventDefault(); setCreating(true); setError(''); setNotice('');
    try {
      const { data, error: rpcError } = await requireSupabase().rpc('create_support_ticket', { p_subject: subject.trim(), p_category: category, p_message: body.trim() });
      if (rpcError) throw rpcError;
      if (!data) throw new Error('Support service did not return a ticket ID.');
      setSubject(''); setBody(''); setTab('tickets'); setSelected(data as string);
      setNotice('Your support ticket has been created.');
      await load();
    } catch (cause) { setError(explain(cause)); }
    finally { setCreating(false); }
  };

  const sendReply = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return;
    setSending(true); setError(''); setNotice('');
    try {
      const { error: rpcError } = await requireSupabase().rpc('member_reply_support_ticket', { p_ticket_id: selected, p_message: reply.trim() });
      if (rpcError) throw rpcError;
      setReply(''); setNotice('Your reply has been sent.');
      await Promise.all([loadMessages(selected), load()]);
    } catch (cause) { setError(explain(cause)); }
    finally { setSending(false); }
  };

  const unread = notices.filter(item => !item.read_at).length;
  const activeTicket = tickets.find(item => item.id === selected);
  return <main className="vmc">
    <header className="vmc-head"><div><span className="vmc-brand">VYRA REWARDS GLOBAL</span><h1>Notifications & Support</h1><p>Stay informed and contact the support team securely.</p></div><button onClick={onBack}>Back to dashboard</button></header>
    {error && <div className="vmc-alert" role="alert">{error}</div>}
    {notice && <div className="vmc-success" role="status">{notice}</div>}
    <nav className="vmc-tabs"><button className={tab === 'notifications' ? 'active' : ''} onClick={() => setTab('notifications')}>Notifications <span>{unread} unread</span></button><button className={tab === 'tickets' ? 'active' : ''} onClick={() => setTab('tickets')}>Support tickets <span>{tickets.length}</span></button><button className="vmc-refresh" onClick={() => void load()} disabled={loading}>Refresh</button></nav>
    {loading ? <section className="vmc-panel"><p>Loading your account updates…</p></section> : tab === 'notifications' ? <section className="vmc-panel"><div className="vmc-panel-title"><h2>Your notifications</h2><small>Latest 50 · private to your account</small></div>{notices.length === 0 ? <p className="vmc-empty">No notifications yet. Important account and support updates will appear here.</p> : <ul className="vmc-list">{notices.map(item => <li key={item.id} className={!item.read_at ? 'unread' : ''}><div className="vmc-item-top"><strong>{item.title}</strong><span>{item.notification_type.replaceAll('_', ' ')}</span></div><p>{item.body}</p><small>{fmt(item.created_at)}</small>{!item.read_at && <button onClick={() => void markRead(item.id)}>Mark as read</button>}</li>)}</ul>}</section> : <div className="vmc-grid">
      <section className="vmc-panel"><div className="vmc-panel-title"><h2>Open a support ticket</h2></div><form className="vmc-form" onSubmit={createTicket}><label>Subject<input value={subject} onChange={e => setSubject(e.target.value)} minLength={4} maxLength={120} required placeholder="Briefly describe the issue" /></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></label><label>Message<textarea value={body} onChange={e => setBody(e.target.value)} minLength={1} maxLength={5000} rows={5} required placeholder="Explain how we can help…" /></label><button className="vmc-primary" disabled={creating}>{creating ? 'Submitting…' : 'Submit ticket'}</button></form><div className="vmc-ticket-list"><h3>Your tickets</h3>{tickets.length === 0 ? <p className="vmc-empty">You have not created a support ticket yet.</p> : tickets.map(ticket => <button key={ticket.id} className={selected === ticket.id ? 'selected' : ''} onClick={() => setSelected(ticket.id)}><span><strong>{ticket.subject}</strong><small>{ticket.category} · Updated {fmt(ticket.updated_at)}</small></span><em>{ticket.status.replaceAll('_', ' ')}</em></button>)}</div></section>
      <section className="vmc-panel vmc-thread"><div className="vmc-panel-title"><h2>{activeTicket ? activeTicket.subject : 'Ticket conversation'}</h2>{activeTicket && <small>{activeTicket.status.replaceAll('_', ' ')}</small>}</div>{!activeTicket ? <p className="vmc-empty">Select one of your tickets to view its conversation.</p> : <><div className="vmc-messages">{messages.map(message => <article key={message.id} className={message.sender_role === 'admin' ? 'admin' : 'member'}><span>{message.sender_role === 'admin' ? 'Vyra Support' : 'You'}</span><p>{message.message}</p><small>{fmt(message.created_at)}</small></article>)}</div>{['open','in_progress','waiting_member'].includes(activeTicket.status) ? <form className="vmc-reply" onSubmit={sendReply}><textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} maxLength={5000} required placeholder="Write a reply…" /><button className="vmc-primary" disabled={sending}>{sending ? 'Sending…' : 'Send reply'}</button></form> : <p className="vmc-empty">This ticket is {activeTicket.status}. It is read-only.</p>}</>}</section>
    </div>}
    <p className="vmc-note">Ticket messages and notifications are read through your authenticated account. Ticket creation, replies and read receipts use database functions; the member interface cannot change ticket priority or grant admin access.</p>
  </main>;
}
