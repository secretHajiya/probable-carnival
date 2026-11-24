import React from 'react';

type QueueItem = {
  withdrawal_id: string;
  sender_batch_id: string;
  provider_batch_id: string | null;
  amount_minor: number;
  currency_code: string;
  status: 'reconciling' | 'quarantined' | string;
  updated_at: string;
};
type Inspection = {
  status: string;
  automatic_settlement?: boolean;
  reason?: string;
  withdrawal_id?: string;
  sender_batch_id?: string;
  provider_batch_id?: string;
  expected_amount_minor?: number;
  expected_currency?: string;
  provider_batch_status?: string;
  provider_completed_at?: string | null;
  provider_status?: number;
  items?: Array<{ payout_item_id?: string; transaction_status?: string; transaction_id?: string; amount?: string | null; currency?: string | null }>;
};

export function AdminPaypalReconciliation({ accessToken, workerUrl }: { accessToken: string; workerUrl?: string }) {
  const [items, setItems] = React.useState<QueueItem[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [inspection, setInspection] = React.useState<Inspection | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const base = workerUrl?.replace(/\/$/, '');

  const request = React.useCallback(async (path: string) => {
    if (!base) throw new Error('Set VITE_PAYPAL_PAYOUT_WORKER_URL to the PayPal Sandbox Worker URL.');
    const response = await fetch(`${base}${path}`, { headers: { authorization: `Bearer ${accessToken}` } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
    return body;
  }, [base, accessToken]);

  const refresh = React.useCallback(async () => {
    setBusy(true); setError('');
    try {
      const body = await request('/v1/admin/paypal-payouts/reconciliation');
      setItems(Array.isArray(body.items) ? body.items : []);
      setInspection(null); setSelected(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load reconciliation queue.'); }
    finally { setBusy(false); }
  }, [request]);
  React.useEffect(() => { void refresh(); }, [refresh]);

  async function inspect(id: string) {
    setSelected(id); setInspection(null); setBusy(true); setError('');
    try {
      const body = await request(`/v1/admin/paypal-payouts/${encodeURIComponent(id)}/reconciliation-detail`);
      setInspection(body as Inspection);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to inspect PayPal payout.'); }
    finally { setBusy(false); }
  }

  const money = (minor?: number, currency?: string) => minor == null ? '—' : `${currency || ''} ${(minor / 100).toFixed(2)}`;
  return <section className="panel paypal-recon">
    <div className="section-head"><div><h2>Reconciliation queue</h2><p>Read-only checks for PayPal payouts requiring manual attention. No action here can settle or refund a withdrawal.</p></div><button className="secondary" onClick={()=>void refresh()} disabled={busy}>Refresh queue</button></div>
    {error && <p className="error" role="alert">{error}</p>}
    {busy && <p>Loading secure PayPal inspection…</p>}
    {!busy && items.length === 0 && <p>No PayPal payouts currently require reconciliation.</p>}
    {items.length > 0 && <div className="table-wrap"><table className="paypal-recon-table"><thead><tr><th>Withdrawal</th><th>Expected amount</th><th>Status</th><th>Provider batch</th><th>Last updated</th><th>Inspection</th></tr></thead><tbody>{items.map(item=><tr key={item.withdrawal_id}><td><code>{item.withdrawal_id}</code></td><td>{money(item.amount_minor,item.currency_code)}</td><td><span className="pill">{item.status}</span></td><td>{item.provider_batch_id ? <code>{item.provider_batch_id}</code> : 'Not assigned'}</td><td>{new Date(item.updated_at).toLocaleString()}</td><td><button className="secondary" disabled={busy} onClick={()=>void inspect(item.withdrawal_id)}>Inspect</button></td></tr>)}</tbody></table></div>}
    {inspection && selected && <article className="paypal-inspection"><div className="section-head"><div><h3>Provider inspection</h3><p>Withdrawal <code>{selected}</code></p></div><span className="pill">{inspection.status}</span></div>
      {inspection.status === 'manual_reconciliation_required' ? <p className="muted">Provider batch reference is missing. Manual investigation is required; do not retry the payout automatically.</p> : inspection.status === 'provider_lookup_unavailable' ? <p className="error">PayPal lookup is unavailable (HTTP {inspection.provider_status ?? 'unknown'}). No settlement was performed.</p> : <>
        <dl className="paypal-inspection-grid"><div><dt>Expected amount</dt><dd>{money(inspection.expected_amount_minor,inspection.expected_currency)}</dd></div><div><dt>PayPal batch status</dt><dd>{inspection.provider_batch_status || 'Unknown'}</dd></div><div><dt>Provider batch ID</dt><dd><code>{inspection.provider_batch_id || '—'}</code></dd></div><div><dt>Completed at</dt><dd>{inspection.provider_completed_at ? new Date(inspection.provider_completed_at).toLocaleString() : '—'}</dd></div></dl>
        <h4>PayPal payout items</h4>{inspection.items?.length ? <div className="table-wrap"><table><thead><tr><th>Item ID</th><th>Transaction status</th><th>Transaction ID</th><th>Amount</th></tr></thead><tbody>{inspection.items.map((item,i)=><tr key={item.payout_item_id || i}><td><code>{item.payout_item_id || '—'}</code></td><td>{item.transaction_status || 'Unknown'}</td><td><code>{item.transaction_id || '—'}</code></td><td>{item.amount || '—'} {item.currency || ''}</td></tr>)}</tbody></table></div> : <p>No payout item details returned.</p>}
      </>}
      <p className="muted">Inspection only. Compare the withdrawal ID, expected amount/currency and PayPal item status. Only the signature-verified, correlated webhook may finalize settlement. Do not manually mark paid or refund from this screen.</p>
    </article>}
  </section>;
}
