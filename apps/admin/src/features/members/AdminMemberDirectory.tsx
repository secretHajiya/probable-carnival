import React from 'react';
import { requireSupabase } from '../../lib/supabase';
import { listAdminMembers, type AdminMember } from './members';

const PAGE_SIZE = 25;
const statuses = ['active', 'suspended', 'closed'] as const;
type StatusFilter = typeof statuses[number] | '';

export function AdminMemberDirectory({ onBack }: { onBack: () => void }) {
  const [search, setSearch] = React.useState('');
  const [country, setCountry] = React.useState('');
  const [status, setStatus] = React.useState<StatusFilter>('');
  const [offset, setOffset] = React.useState(0);
  const [rows, setRows] = React.useState<AdminMember[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [hasMore, setHasMore] = React.useState(false);

  const load = React.useCallback(async () => {
    setBusy(true); setError('');
    try {
      const result = await listAdminMembers(requireSupabase(), { search, status: status || null, countryCode: country || null, limit: PAGE_SIZE + 1, offset });
      setHasMore(result.length > PAGE_SIZE);
      setRows(result.slice(0, PAGE_SIZE));
    } catch (e) {
      setRows([]); setHasMore(false);
      setError(e instanceof Error ? e.message : 'Unable to load member directory.');
    } finally { setBusy(false); }
  }, [search, status, country, offset]);

  React.useEffect(() => { void load(); }, [load]);
  function applyFilters(event: React.FormEvent) { event.preventDefault(); setOffset(0); }

  return <section className="panel member-directory">
    <div className="section-head"><div><h2>Member directory</h2><p>Read-only member lookup. Account status and wallet balances cannot be changed here.</p></div><div className="head-actions"><button className="secondary" onClick={onBack}>Back to dashboard</button><button className="secondary" onClick={() => void load()} disabled={busy}>Refresh</button></div></div>
    <form className="member-filters" onSubmit={applyFilters}>
      <label>Search name or exact member UUID<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or UUID" maxLength={120} /></label>
      <label>Account status<select value={status} onChange={e => { setStatus(e.target.value as StatusFilter); setOffset(0); }}><option value="">All statuses</option>{statuses.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>Country code<input value={country} onChange={e => { setCountry(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0,2)); setOffset(0); }} placeholder="NG" maxLength={2} /></label>
      <button disabled={busy}>Search</button>
    </form>
    {error && <div className="notice error" role="alert">{error}</div>}
    {busy && <p>Loading members…</p>}
    {!busy && !error && rows.length === 0 && <p>No members match these filters.</p>}
    <div className="table-wrap"><table className="members-table"><thead><tr><th>Member</th><th>Country</th><th>Account status</th><th>Joined</th></tr></thead><tbody>{rows.map(member => <tr key={member.member_id}><td><strong>{member.display_name || 'Member'}</strong><small>{member.member_id}</small></td><td>{member.country_code || '—'}</td><td><span className={`pill member-status ${member.account_status}`}>{member.account_status}</span></td><td>{new Date(member.joined_at).toLocaleString()}</td></tr>)}</tbody></table></div>
    <div className="member-pagination"><span>Showing {rows.length ? offset + 1 : 0}–{offset + rows.length}</span><div><button className="secondary" disabled={busy || offset === 0} onClick={() => setOffset(value => Math.max(0, value - PAGE_SIZE))}>Previous</button><button className="secondary" disabled={busy || !hasMore} onClick={() => setOffset(value => value + PAGE_SIZE)}>Next</button></div></div>
  </section>;
}
