import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { DirectionalText as Text, DirectionalTextInput as TextInput } from './DirectionProvider';
import { memberInboxService, type MemberNotification, type SupportMessage, type SupportTicket } from '../services/member-inbox.service';
import { rit } from '../services/referral-inbox-i18n';
import type { MemberLanguage } from '../services/profile-settings.service';

type Props = { userId: string; language: MemberLanguage };
const categories = ['general', 'account', 'wallet', 'withdrawal', 'rewards', 'technical'];
const dateText = (value: string, unavailable: string) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? unavailable : d.toLocaleString(); };

export function MemberInboxPanel({ userId, language }: Props) {
  const t = (key: Parameters<typeof rit>[1]) => rit(language, key);
  const [section, setSection] = useState<'notifications' | 'support'>('notifications');
  const [notifications, setNotifications] = useState<MemberNotification[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [newMessage, setNewMessage] = useState('');
  const [reply, setReply] = useState('');
  const [compose, setCompose] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [n, t] = await Promise.all([memberInboxService.listNotifications(), memberInboxService.listTickets()]);
      setNotifications(n); setTickets(t);
      if (selected) {
        const stillAvailable = t.find(x => x.id === selected.id);
        if (stillAvailable) setSelected(stillAvailable); else { setSelected(null); setMessages([]); }
      }
    } catch (e) { setError(e instanceof Error ? e.message : t('inboxLoadError')); }
    finally { setLoading(false); setRefreshing(false); }
  }, [selected?.id, language]);
  useEffect(() => { void load(); }, [load, userId]);

  async function openTicket(ticket: SupportTicket) {
    setSelected(ticket); setCompose(false); setError(''); setBusy(true);
    try { setMessages(await memberInboxService.listMessages(ticket.id)); }
    catch (e) { setError(e instanceof Error ? e.message : t('conversationLoadError')); }
    finally { setBusy(false); }
  }
  async function markRead(item: MemberNotification) {
    if (item.read_at) return;
    setError('');
    try {
      await memberInboxService.markRead(item.id);
      setNotifications(current => current.map(n => n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n));
    } catch (e) { setError(e instanceof Error ? e.message : t('markReadError')); }
  }
  async function createTicket() {
    setBusy(true); setError(''); setNotice('');
    try {
      const id = await memberInboxService.createTicket(subject, category, newMessage);
      setSubject(''); setNewMessage(''); setCompose(false); setNotice(t('ticketSubmitted'));
      await load(true);
      const ticket = (await memberInboxService.listTickets()).find(t => t.id === id);
      if (ticket) await openTicket(ticket);
    } catch (e) { setError(e instanceof Error ? e.message : t('ticketSubmitError')); }
    finally { setBusy(false); }
  }
  async function sendReply() {
    if (!selected) return;
    setBusy(true); setError('');
    try {
      await memberInboxService.replyTicket(selected.id, reply);
      setReply(''); setMessages(await memberInboxService.listMessages(selected.id));
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : t('replyError')); }
    finally { setBusy(false); }
  }

  return <View style={st.wrap}>
    <Text style={st.title}>{t('inboxTitle')}</Text>
    <Text style={st.sub}>{t('inboxSubtitle')}</Text>
    <View style={st.switchRow}>
      <TouchableOpacity style={[st.switch, section === 'notifications' && st.switchActive]} onPress={() => { setSection('notifications'); setSelected(null); setCompose(false); }}><Text style={[st.switchsection === 'notifications' && st.switchTextActive]}>{t('notifications')} ({notifications.filter(n => !n.read_at).length})</Text></TouchableOpacity>
      <TouchableOpacity style={[st.switch, section === 'support' && st.switchActive]} onPress={() => { setSection('support'); setSelected(null); setCompose(false); }}><Text style={[st.switchsection === 'support' && st.switchTextActive]}>{t('support')} ({tickets.length})</Text></TouchableOpacity>
    </View>
    {!!error && <View style={st.error}><Text style={st.errorText}>{error}</Text><TouchableOpacity onPress={() => void load(true)}><Text style={st.action}>{t('tryAgain')}</Text></TouchableOpacity></View>}
    {!!notice && <Text style={st.success}>{notice}</Text>}
    {loading ? <View style={st.state}><ActivityIndicator color="#5558E8"/><Text style={st.muted}>{t('loadingInbox')}</Text></View> : <ScrollView style={st.list} nestedScrollEnabled refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#5558E8"/>}>
      {section === 'notifications' && <>
        {notifications.length === 0 ? <Empty title={t('noNotifications')} body={t('notificationsHelp')}/> : notifications.map(item => <TouchableOpacity key={item.id} style={[st.card, !item.read_at && st.unread]} onPress={() => void markRead(item)}>
          <View style={st.cardTop}><Text style={st.cardTitle}>{item.title}</Text><Text style={st.kind}>{(['general','account','wallet','withdrawal','rewards','technical'].includes(item.notification_type) ? t(item.notification_type as Parameters<typeof rit>[1]) : item.notification_type)}</Text></View>
          <Text style={st.cardBody}>{item.body}</Text><Text style={st.date}>{dateText(item.created_at, t('dateUnavailable'))} · {item.read_at ? t('read') : t('markRead')}</Text>
        </TouchableOpacity>)}
      </>}
      {section === 'support' && <>
        {!selected && !compose && <>
          <TouchableOpacity style={st.primary} onPress={() => setCompose(true)}><Text style={st.primaryText}>{t('createTicket')}</Text></TouchableOpacity>
          {tickets.length === 0 ? <Empty title={t('noTickets')} body={t('ticketsHelp')}/> : tickets.map(ticket => <TouchableOpacity key={ticket.id} style={st.card} onPress={() => void openTicket(ticket)}>
            <View style={st.cardTop}><Text style={st.cardTitle}>{ticket.subject}</Text><Text style={st.kind}>{ticket.status.replace(/_/g, ' ')}</Text></View>
            <Text style={st.cardBody}>{t(ticket.category as Parameters<typeof rit>[1])} · {ticket.priority} {t('priority')}</Text><Text style={st.date}>{t('updated')} {dateText(ticket.updated_at, t('dateUnavailable'))}</Text>
          </TouchableOpacity>)}
        </>}
        {compose && <View style={st.form}>
          <Text style={st.formTitle}>{t('newTicket')}</Text>
          <Text style={st.label}>{t('subject')}</Text><TextInput value={subject} onChangeText={setSubject} maxLength={120} placeholder={t('subjectPlaceholder')} style={st.input}/>
          <Text style={st.label}>{t('category')}</Text><View style={st.categoryRow}>{categories.map(c => <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[st.category, category === c && st.categorySelected]}><Text style={[st.categorycategory === c && st.categoryTextSelected]}>{t(c as Parameters<typeof rit>[1])}</Text></TouchableOpacity>)}</View>
          <Text style={st.label}>{t('message')}</Text><TextInput value={newMessage} onChangeText={setNewMessage} maxLength={5000} multiline textAlignVertical="top" placeholder={t('messagePlaceholder')} style={[st.input, st.textarea]}/>
          <TouchableOpacity disabled={busy} style={st.primary} onPress={() => void createTicket()}><Text style={st.primaryText}>{busy ? t('submitting') : t('submitTicket')}</Text></TouchableOpacity>
          <TouchableOpacity style={st.secondary} onPress={() => setCompose(false)}><Text style={st.secondaryText}>{t('cancel')}</Text></TouchableOpacity>
        </View>}
        {!!selected && <View style={st.conversation}>
          <TouchableOpacity onPress={() => { setSelected(null); setMessages([]); }}><Text style={st.action}>{t('backTickets')}</Text></TouchableOpacity>
          <Text style={st.formTitle}>{selected.subject}</Text><Text style={st.date}>{t('status')}: {selected.status === 'closed' ? t('ticketClosed') : selected.status === 'in_progress' ? t('inProgress') : selected.status === 'waiting_member' ? t('waitingMember') : selected.status}</Text>
          {busy && messages.length === 0 ? <ActivityIndicator color="#5558E8"/> : messages.map(m => <View key={m.id} style={[st.message, m.sender_role === 'member' ? st.memberMessage : st.adminMessage]}><Text style={st.messageRole}>{m.sender_role === 'admin' ? t('supportAgent') : t('you')}</Text><Text style={st.messageText}>{m.message}</Text><Text style={st.date}>{dateText(m.created_at, t('dateUnavailable'))}</Text></View>)}
          {['open','in_progress','waiting_member'].includes(selected.status) ? <><TextInput value={reply} onChangeText={setReply} maxLength={5000} multiline textAlignVertical="top" placeholder={t('replyPlaceholder')} style={[st.input, st.textarea]}/><TouchableOpacity disabled={busy} style={st.primary} onPress={() => void sendReply()}><Text style={st.primaryText}>{busy ? t('sending') : t('sendReply')}</Text></TouchableOpacity></> : <Text style={st.muted}>{t('closedTicket')}</Text>}
        </View>}
      </>}
    </ScrollView>}
  </View>;
}
function Empty({title,body}:{title:string;body:string}) { return <View style={st.state}><Text style={st.emptyTitle}>{title}</Text><Text style={st.muted}>{body}</Text></View>; }
const st = StyleSheet.create({wrap:{backgroundColor:'#FFF',borderRadius:17,padding:15,borderWidth:1,borderColor:'#E8EAF3',gap:12},title:{color:'#191C38',fontSize:18,fontWeight:'900'},sub:{color:'#858BA0',fontSize:11,lineHeight:16},switchRow:{flexDirection:'row',backgroundColor:'#F1F2FA',borderRadius:11,padding:3},switch:{flex:1,padding:10,borderRadius:9,alignItems:'center'},switchActive:{backgroundColor:'#FFF'},switchText:{color:'#777D95',fontSize:11,fontWeight:'800'},switchTextActive:{color:'#4548C5'},list:{maxHeight:650},card:{padding:13,borderRadius:12,borderWidth:1,borderColor:'#EAECF4',marginBottom:9,gap:6},unread:{backgroundColor:'#F5F6FF',borderColor:'#DADCFB'},cardTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:8},cardTitle:{flex:1,color:'#242743',fontSize:13,fontWeight:'900'},kind:{color:'#5558E8',fontSize:9,fontWeight:'800',textTransform:'capitalize'},cardBody:{color:'#646A80',fontSize:12,lineHeight:18},date:{color:'#9298AC',fontSize:9,lineHeight:14},state:{padding:22,minHeight:150,justifyContent:'center',alignItems:'center',gap:9},muted:{color:'#858BA0',fontSize:11,lineHeight:17},emptyTitle:{color:'#242743',fontSize:14,fontWeight:'900'},primary:{backgroundColor:'#5558E8',padding:13,borderRadius:11,alignItems:'center',marginBottom:10},primaryText:{color:'#FFF',fontSize:12,fontWeight:'900'},secondary:{padding:11,alignItems:'center'},secondaryText:{color:'#5558E8',fontSize:12,fontWeight:'800'},form:{gap:9,padding:3},formTitle:{color:'#202440',fontSize:16,fontWeight:'900'},label:{color:'#414660',fontSize:11,fontWeight:'800'},input:{borderWidth:1,borderColor:'#DDE1EF',borderRadius:10,padding:12,color:'#171A31',backgroundColor:'#FFF',fontSize:12},textarea:{minHeight:105,maxHeight:180},categoryRow:{flexDirection:'row',flexWrap:'wrap',gap:6},category:{borderWidth:1,borderColor:'#E0E2ED',borderRadius:20,paddingHorizontal:10,paddingVertical:7},categorySelected:{backgroundColor:'#EEEEFF',borderColor:'#777AE8'},categoryText:{fontSize:10,color:'#777D95',textTransform:'capitalize'},categoryTextSelected:{color:'#4548C5',fontWeight:'900'},conversation:{gap:10},message:{padding:12,borderRadius:12,gap:5,maxWidth:'92%'},memberMessage:{alignSelf:'flex-end',backgroundColor:'#EEEEFF'},adminMessage:{alignSelf:'flex-start',backgroundColor:'#F1F3F8'},messageRole:{fontSize:10,color:'#5558E8',fontWeight:'900'},messageText:{fontSize:12,color:'#292D47',lineHeight:18},action:{color:'#5558E8',fontSize:11,fontWeight:'900',paddingVertical:6},error:{backgroundColor:'#FFF0F0',padding:11,borderRadius:10,gap:5},errorText:{color:'#A32929',fontSize:11},success:{color:'#18794E',fontSize:11,fontWeight:'700'}});
