import React from 'react';
import { requireSupabase } from '../../lib/supabase';

type Ticket = {
  ticket_id: string;
  user_id: string;
  subject: string;
  category: string;
  status: 'open' | 'in_progress' | 'waiting_member' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high';
  created_at: string;
  updated_at: string;
};
type SupportMessage = {
  message_id: string;
  sender_user_id: string;
  sender_role: 'member' | 'admin';
  message: string;
  created_at: string;
};
const statuses = ['open', 'in_progress', 'waiting_member', 'resolved', 'closed'] as const;
type TicketStatus = typeof statuses[number];

export function AdminSupportInbox({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = React.useState('open');
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [selected, setSelected] = React.useState<Ticket | null>(null);
  const [messages, setMessages] = React.useState<SupportMessage[]>([]);
  const [reply, setReply] = React.useState('');
  const [nextStatus, setNextStatus] = React.useState<TicketStatus>('waiting_member');
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');

  const loadTickets = React.useCallback(async () => {
    setBusy(true); setMessage('');
    try {
      const { data, error } = await requireSupabase().rpc('admin_list_support_tickets', {
        p_status: filter || null, p_limit: 100, p_offset: 0,
      });
      if (error) throw error;
      const rows = (data ?? []) as Ticket[];
      setTickets(rows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load support tickets.');
      setTickets([]);
    } finally { setBusy(false); }
  }, [filter]);

  React.useEffect(() => { void loadTickets(); }, [loadTickets]);

  async function openTicket(ticket: Ticket) {
    setSelected(ticket); setMessages([]); setReply(''); setNextStatus('waiting_member'); setBusy(true); setMessage('');
    try {
      const { data, error } = await requireSupabase().rpc('admin_get_support_messages', { p_ticket_id: ticket.ticket_id });
      if (error) throw error;
      setMessages((data ?? []) as SupportMessage[]);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load ticket conversation.'); }
    finally { setBusy(false); }
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    if (!window.confirm(`Send this reply and set ticket status to “${nextStatus.replace('_', ' ')}”?`)) return;
    setBusy(true); setMessage('');
    try {
      const { error } = await requireSupabase().rpc('admin_reply_support_ticket', {
        p_ticket_id: selected.ticket_id,
        p_message: reply.trim(),
        p_status: nextStatus,
      });
      if (error) throw error;
      setReply('');
      setMessage('Reply sent. The member has been notified and the action was audited.');
      const { data, error: readError } = await requireSupabase().rpc('admin_get_support_messages', { p_ticket_id: selected.ticket_id });
      if (readError) throw readError;
      setMessages((data ?? []) as SupportMessage[]);
      await loadTickets();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Reply could not be sent.'); }
    finally { setBusy(false); }
  }

  return <section className="panel support-inbox">
    <div className="section-head">
      <div><h2>Member Support Inbox</h2><p>Tickets and replies are retrieved through admin-only database RPCs.</p></div>
      <div className="head-actions"><button className="secondary" onClick={onBack}>Back to finance</button><button className="secondary" onClick={() => void loadTickets()} disabled={busy}>Refresh</button></div>
    </div>
    {message && <div className="notice" role="status">{message}</div>}
    <div className="support-layout">
      <aside className="support-queue">
        <label className="filter-label">Ticket status
          <select value={filter} onChange={event => { setFilter(event.target.value); setSelected(null); setMessages([]); }}>
            <option value="">All statuses</option>{statuses.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
          </select>
        </label>
        {busy && tickets.length === 0 && <p>Loading tickets…</p>}
        {!busy && tickets.length === 0 && <p>No tickets in this queue.</p>}
        {tickets.map(ticket => <button key={ticket.ticket_id} className={`ticket-row ${selected?.ticket_id === ticket.ticket_id ? 'active' : ''}`} onClick={() => void openTicket(ticket)}>
          <span className="ticket-row-top"><strong>{ticket.subject}</strong><span className={`priority ${ticket.priority}`}>{ticket.priority}</span></span>
          <span>{ticket.category} · {ticket.status.replace('_', ' ')}</span>
          <small>{new Date(ticket.updated_at).toLocaleString()}</small>
          <small>Member: {ticket.user_id}</small>
        </button>)}
      </aside>
      <div className="support-conversation">
        {!selected ? <div className="empty-conversation">Select a ticket to read its conversation.</div> : <>
          <div className="ticket-heading"><div><h3>{selected.subject}</h3><p>{selected.category} · {selected.priority} priority · {selected.status.replace('_', ' ')}</p><small>Member ID: {selected.user_id}</small></div></div>
          <div className="message-thread">
            {messages.map(item => <article key={item.message_id} className={`support-message ${item.sender_role}`}>
              <div><strong>{item.sender_role === 'admin' ? 'Admin' : 'Member'}</strong><time>{new Date(item.created_at).toLocaleString()}</time></div>
              <p>{item.message}</p>
            </article>)}
            {messages.length === 0 && <p>No messages found for this ticket.</p>}
          </div>
          {selected.status !== 'closed' && <form className="support-reply" onSubmit={sendReply}>
            <label>Reply to member<textarea value={reply} onChange={event => setReply(event.target.value)} minLength={1} maxLength={5000} rows={4} required placeholder="Write a clear response…" /></label>
            <div className="reply-actions"><label>Set status after reply<select value={nextStatus} onChange={event => setNextStatus(event.target.value as TicketStatus)}>{statuses.filter(status => status !== 'open').map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></label><button disabled={busy || !reply.trim()}>{busy ? 'Sending…' : 'Send reply'}</button></div>
          </form>}
          {selected.status === 'closed' && <p className="closed-note">This ticket is closed. Reopen it from the database workflow before replying.</p>}
        </>}
      </div>
    </div>
  </section>;
}
