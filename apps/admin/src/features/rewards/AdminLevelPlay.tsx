import React from 'react';
import { requireSupabase } from '../../lib/supabase';

type LevelPlayConfig = {
  is_enabled: boolean; app_key: string | null; ad_unit_id: string | null; placement_name: string | null;
  expected_reward_amount: number; coins_per_reward: number; updated_at: string | null;
  interstitial_enabled: boolean; interstitial_ad_unit_id: string | null; interstitial_placement_name: string | null;
  banner_enabled: boolean; banner_ad_unit_id: string | null; banner_placement_name: string | null;
};
const empty: LevelPlayConfig = {
  is_enabled:false,app_key:null,ad_unit_id:null,placement_name:null,expected_reward_amount:0,coins_per_reward:0,updated_at:null,
  interstitial_enabled:false,interstitial_ad_unit_id:null,interstitial_placement_name:null,
  banner_enabled:false,banner_ad_unit_id:null,banner_placement_name:null,
};

export function AdminLevelPlay({ onBack }: { onBack: () => void }) {
  const [config,setConfig]=React.useState<LevelPlayConfig|null>(null);
  const [busy,setBusy]=React.useState(false); const [saving,setSaving]=React.useState(false);
  const [error,setError]=React.useState(''); const [notice,setNotice]=React.useState('');
  const load=React.useCallback(async()=>{
    setBusy(true);setError('');setNotice('');
    try { const {data,error:rpcError}=await requireSupabase().rpc('admin_get_levelplay_reward_config'); if(rpcError) throw rpcError; setConfig({...empty,...(data as Partial<LevelPlayConfig>)}); }
    catch(e){setError(e instanceof Error?e.message:'Unable to load LevelPlay configuration.');} finally{setBusy(false);}
  },[]);
  React.useEffect(()=>{void load();},[load]);
  function update<K extends keyof LevelPlayConfig>(key:K,value:LevelPlayConfig[K]) { setConfig(v=>v?({...v,[key]:value}):v); }
  async function save(e:React.FormEvent){
    e.preventDefault();if(!config)return;
    const expected=Number(config.expected_reward_amount),coins=Number(config.coins_per_reward);
    if(!Number.isSafeInteger(expected)||expected<0||!Number.isSafeInteger(coins)||coins<0){setError('Reward amount and Vyra coin reward must be whole, non-negative numbers.');return;}
    if(config.is_enabled&&(!config.app_key?.trim()||!config.ad_unit_id?.trim()||!config.placement_name?.trim()||expected<=0||coins<=0)){setError('Rewarded requires App Key, Ad Unit ID, Placement, expected reward and coin reward.');return;}
    if(config.interstitial_enabled&&(!config.app_key?.trim()||!config.interstitial_ad_unit_id?.trim()||!config.interstitial_placement_name?.trim())){setError('Interstitial requires App Key, Ad Unit ID and Placement.');return;}
    if(config.banner_enabled&&(!config.app_key?.trim()||!config.banner_ad_unit_id?.trim()||!config.banner_placement_name?.trim())){setError('Banner requires App Key, Ad Unit ID and Placement.');return;}
    if((config.is_enabled||config.interstitial_enabled||config.banner_enabled)&&!window.confirm('Enable the selected LevelPlay ad formats for members? Continue only after the Unity app setup, network adapters, and (for Rewarded) Cloudflare S2S verification have been tested.'))return;
    setSaving(true);setError('');setNotice('');
    try{
      const {error:rpcError}=await requireSupabase().rpc('admin_update_levelplay_reward_config',{
        p_is_enabled:config.is_enabled,p_app_key:config.app_key?.trim()||null,p_ad_unit_id:config.ad_unit_id?.trim()||null,
        p_placement_name:config.placement_name?.trim()||null,p_expected_reward_amount:expected,p_coins_per_reward:coins,
        p_interstitial_enabled:config.interstitial_enabled,p_interstitial_ad_unit_id:config.interstitial_ad_unit_id?.trim()||null,
        p_interstitial_placement_name:config.interstitial_placement_name?.trim()||null,
        p_banner_enabled:config.banner_enabled,p_banner_ad_unit_id:config.banner_ad_unit_id?.trim()||null,
        p_banner_placement_name:config.banner_placement_name?.trim()||null,
      });
      if(rpcError)throw rpcError;setNotice('All LevelPlay settings saved and recorded in the admin audit log.');await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to save LevelPlay configuration.');}finally{setSaving(false);}
  }
  const field=(label:string,key:'app_key'|'ad_unit_id'|'placement_name'|'interstitial_ad_unit_id'|'interstitial_placement_name'|'banner_ad_unit_id'|'banner_placement_name',placeholder:string)=><label>{label}<input maxLength={160} value={config?.[key]||''} onChange={e=>update(key,e.target.value)} placeholder={placeholder} autoComplete="off" /></label>;
  const toggle=(label:string,key:'is_enabled'|'interstitial_enabled'|'banner_enabled')=><label className="check-line"><input type="checkbox" checked={!!config?.[key]} onChange={e=>update(key,e.target.checked)}/>{label}</label>;
  return <section className="panel levelplay-admin">
    <div className="section-head"><div><h2>Unity LevelPlay Ads</h2><p>Configure Rewarded, Interstitial and Banner formats independently.</p></div><div className="head-actions"><button className="secondary" onClick={onBack}>Back</button><button className="secondary" onClick={()=>void load()} disabled={busy||saving}>Refresh</button></div></div>
    <div className="notice">Security: this page never accepts the S2S private key. Keep that key only in Cloudflare Worker secrets. Saving does not deploy a Worker or configure Unity dashboard/ad networks. All formats start disabled.</div>
    {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="success" role="status">{notice}</p>}{busy&&<p>Loading LevelPlay settings…</p>}
    {config&&<form className="settings-form levelplay-form" onSubmit={save}>
      <div className="levelplay-status"><div><span>Last updated</span><strong>{config.updated_at?new Date(config.updated_at).toLocaleString():'Not recorded'}</strong></div></div>
      <h3>Shared SDK configuration</h3>{field('Unity LevelPlay App Key','app_key','Enter the exact App Key from Unity LevelPlay')}
      <hr/><h3>Rewarded Video</h3>{toggle('Enable Rewarded ads (server-verified coins)','is_enabled')}
      {field('Rewarded Ad Unit ID','ad_unit_id','Rewarded Ad Unit ID')}{field('Rewarded placement name','placement_name','Rewarded placement name')}
      <div className="levelplay-fields"><label>Expected LevelPlay reward amount<input type="number" min="0" step="1" value={config.expected_reward_amount} onChange={e=>update('expected_reward_amount',Number(e.target.value))}/></label><label>Vyra coins per verified reward<input type="number" min="0" step="1" value={config.coins_per_reward} onChange={e=>update('coins_per_reward',Number(e.target.value))}/></label></div>
      <p className="muted">Rewarded coins are credited only by the existing verified Cloudflare S2S callback. Never award coins from the phone.</p>
      <hr/><h3>Interstitial</h3>{toggle('Enable Interstitial ads (no coin reward)','interstitial_enabled')}
      {field('Interstitial Ad Unit ID','interstitial_ad_unit_id','Interstitial Ad Unit ID')}{field('Interstitial placement name','interstitial_placement_name','Interstitial placement name')}
      <p className="muted">Interstitials are intended for natural transitions only and must not interrupt sign-in, survey completion or payout flows.</p>
      <hr/><h3>Banner</h3>{toggle('Enable Banner ads (no coin reward)','banner_enabled')}
      {field('Banner Ad Unit ID','banner_ad_unit_id','Banner Ad Unit ID')}{field('Banner placement name','banner_placement_name','Banner placement name')}
      <p className="muted">Banner and Interstitial impressions do not create wallet credits.</p>
      <div className="spin-save-row"><span className="muted">Changes are written through the audited admin RPC.</span><button disabled={saving||busy}>{saving?'Saving…':'Save LevelPlay settings'}</button></div>
    </form>}
    <p className="muted">The existing CPX callback is separate and is not modified by this configuration.</p>
  </section>;
}
