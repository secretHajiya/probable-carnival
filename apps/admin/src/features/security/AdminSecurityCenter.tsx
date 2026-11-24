import React from 'react';
import { requireSupabase } from '../../lib/supabase';
import { listAdminAuditLogs, listAdminRoleAssignments, type AdminAuditEvent, type AdminRoleAssignment } from './security';

const PAGE_SIZE = 50;
const sensitiveKey = /(account|bank|token|secret|password|credential|authorization|phone|email|address|payout|routing)/i;
function safeDetails(value: unknown): string {
  const redact = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(redact);
    if (input && typeof input === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(input as Record<string, unknown>)) out[key] = sensitiveKey.test(key) ? '[REDACTED]' : redact(child);
      return out;
    }
    return input;
  };
  try { return JSON.stringify(redact(value), null, 2); } catch { return 'Details unavailable'; }
}

export function AdminSecurityCenter({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = React.useState<'audit' | 'roles'>('audit');
  const [events, setEvents] = React.useState<AdminAuditEvent[]>([]);
  const [roles, setRoles] = React.useState<AdminRoleAssignment[]>([]);
  const [targetType, setTargetType] = React.useState('');
  const [actionPrefix, setActionPrefix] = React.useState('');
  const [offset, setOffset] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [hasMore, setHasMore] = React.useState(false);

  const loadAudit = React.useCallback(async () => {
    setBusy(true); setError('');
    try {
      const result = await listAdminAuditLogs(requireSupabase(), { targetType: targetType || null, actionPrefix: actionPrefix.trim() || null, limit: PAGE_SIZE + 1, offset });
      setHasMore(result.length > PAGE_SIZE); setEvents(result.slice(0, PAGE_SIZE));
    } catch (e) { setEvents([]); setHasMore(false); setError(e instanceof Error ? e.message : 'Unable to load audit history.'); }
    finally { setBusy(false); }
  }, [targetType, actionPrefix, offset]);

  const loadRoles = React.useCallback(async () => {
    setBusy(true); setError('');
    try { setRoles(await listAdminRoleAssignments(requireSupabase(), 100, 0)); }
    catch (e) { setRoles([]); setError(e instanceof Error ? e.message : 'Unable to load admin roles. Only super admins can view this list.'); }
    finally { setBusy(false); }
  }, []);

  React.useEffect(() => { if (tab === 'audit') void loadAudit(); else void loadRoles(); }, [tab, loadAudit, loadRoles]);

  return <section className="panel security-center">
    <div className="section-head"><div><h2>Account security & audit history</h2><p>Read-only security oversight. This screen cannot grant, revoke or modify administrator roles.</p></div><div className="head-actions"><button className="secondary" onClick={onBack}>Back to dashboard</button><button className="secondary" onClick={() => tab === 'audit' ? void loadAudit() : void loadRoles()} disabled={busy}>Refresh</button></div></div>
    <div className="security-tabs"><button className={tab === 'audit' ? '' : 'secondary'} onClick={() => { setTab('audit'); setOffset(0); }}>Audit history</button><button className={tab === 'roles' ? '' : 'secondary'} onClick={() => setTab('roles')}>Admin role inventory</button></div>
    {tab === 'audit' ? <>
      <form className="security-filters" onSubmit={e => { e.preventDefault(); setOffset(0); }}>
        <label>Target type<select value={targetType} onChange={e => { setTargetType(e.target.value); setOffset(0); }}><option value="">All targets</option>{['withdrawal','member','support_ticket','wallet','referral','reward_rule','provider','admin_role'].map(v => <option key={v} value={v}>{v.replace('_',' ')}</option>)}</select></label>
        <label>Action starts with<input value={actionPrefix} onChange={e => setActionPrefix(e.target.value.slice(0,80))} placeholder="e.g. withdrawal." maxLength={80}/></label>
        <button disabled={busy}>Apply filters</button>
      </form>
      {error && <div className="notice error" role="alert">{error}</div>}
      {busy && <p>Loading audit events…</p>}
      {!busy && !error && events.length === 0 && <p>No audit events found for these filters.</p>}
      <div className="audit-list">{events.map(event => <article className="audit-event" key={event.id}>
        <div className="audit-event-head"><div><strong>{event.action}</strong><span className="pill">{event.target_type || 'system'}</span></div><time>{new Date(event.created_at).toLocaleString()}</time></div>
        <p>Actor: <code>{event.actor_user_id || 'System'}</code></p><p>Target: <code>{event.target_id || '—'}</code></p>
        {(event.before_data || event.after_data) && <details><summary>View redacted change details</summary><div className="audit-json"><div><b>Before</b><pre>{safeDetails(event.before_data ?? {})}</pre></div><div><b>After</b><pre>{safeDetails(event.after_data ?? {})}</pre></div></div></details>}
      </article>)}</div>
      <div className="member-pagination"><span>Showing {events.length ? offset + 1 : 0}–{offset + events.length}</span><div><button className="secondary" disabled={busy || offset === 0} onClick={() => setOffset(v => Math.max(0,v-PAGE_SIZE))}>Previous</button><button className="secondary" disabled={busy || !hasMore} onClick={() => setOffset(v => v+PAGE_SIZE)}>Next</button></div></div>
    </> : <>
      <div className="notice">This inventory is restricted by the database to active <code>super_admin</code> users. Role changes must be performed through a separately reviewed, audited process.</div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {busy && <p>Loading administrator roles…</p>}
      {!busy && !error && roles.length === 0 && <p>No administrator role assignments found.</p>}
      <div className="table-wrap"><table className="role-table"><thead><tr><th>Admin user UUID</th><th>Role</th><th>Status</th><th>Granted by</th><th>Granted at</th></tr></thead><tbody>{roles.map(row => <tr key={row.user_id}><td><code>{row.user_id}</code></td><td>{row.role}</td><td><span className={`pill ${row.is_active ? 'member-status active' : 'member-status closed'}`}>{row.is_active ? 'Active' : 'Inactive'}</span></td><td><code>{row.granted_by || '—'}</code></td><td>{new Date(row.granted_at).toLocaleString()}</td></tr>)}</tbody></table></div>
    </>}
  </section>;
}
