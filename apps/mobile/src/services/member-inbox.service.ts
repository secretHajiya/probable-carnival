import { requireSupabase } from '../lib/supabase';

export type MemberNotification = {
  id: string; title: string; body: string; notification_type: string;
  action_path: string | null; read_at: string | null; created_at: string;
};
export type SupportTicket = {
  id: string; subject: string; category: string; status: string;
  priority: string; created_at: string; updated_at: string;
};
export type SupportMessage = {
  id: string; sender_user_id: string; sender_role: 'member' | 'admin';
  message: string; created_at: string;
};

export const memberInboxService = {
  async listNotifications(): Promise<MemberNotification[]> {
    const { data, error } = await requireSupabase().from('member_notifications')
      .select('id,title,body,notification_type,action_path,read_at,created_at')
      .order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return (data ?? []) as MemberNotification[];
  },
  async listTickets(): Promise<SupportTicket[]> {
    const { data, error } = await requireSupabase().from('support_tickets')
      .select('id,subject,category,status,priority,created_at,updated_at')
      .order('updated_at', { ascending: false }).limit(50);
    if (error) throw error;
    return (data ?? []) as SupportTicket[];
  },
  async listMessages(ticketId: string): Promise<SupportMessage[]> {
    if (!ticketId) throw new Error('Select a support ticket first.');
    const { data, error } = await requireSupabase().from('support_messages')
      .select('id,sender_user_id,sender_role,message,created_at')
      .eq('ticket_id', ticketId).order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as SupportMessage[];
  },
  async createTicket(subject: string, category: string, message: string): Promise<string> {
    const cleanSubject = subject.trim(); const cleanMessage = message.trim();
    if (cleanSubject.length < 4 || cleanSubject.length > 120) throw new Error('Subject must be 4–120 characters.');
    if (!cleanMessage || cleanMessage.length > 5000) throw new Error('Message must be 1–5000 characters.');
    const { data, error } = await requireSupabase().rpc('create_support_ticket', {
      p_subject: cleanSubject, p_category: category, p_message: cleanMessage,
    });
    if (error) throw error;
    if (typeof data !== 'string') throw new Error('The support ticket was not created.');
    return data;
  },
  async replyTicket(ticketId: string, message: string): Promise<void> {
    const cleanMessage = message.trim();
    if (!cleanMessage || cleanMessage.length > 5000) throw new Error('Reply must be 1–5000 characters.');
    const { error } = await requireSupabase().rpc('member_reply_support_ticket', {
      p_ticket_id: ticketId, p_message: cleanMessage,
    });
    if (error) throw error;
  },
  async markRead(notificationId: string): Promise<void> {
    const { data, error } = await requireSupabase().rpc('mark_notification_read', {
      p_notification_id: notificationId,
    });
    if (error) throw error;
    if (data !== true) throw new Error('Notification is not available for this account.');
  },
};
