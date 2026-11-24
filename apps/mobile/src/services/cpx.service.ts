import { requireSupabase } from '../lib/supabase';

type CpxWallConfig = {
  providerEnabled: true;
  platform: 'android';
  countryCode: string;
  iframeUrl: string;
};

export const cpxService = {
  async getAndroidOfferwallUrl(): Promise<string> {
    const { data, error } = await requireSupabase().functions.invoke('cpx-wall-config', {
      body: { platform: 'android' },
    });
    if (error) throw new Error(error.message || 'Could not prepare CPX Research.');
    const config = data as CpxWallConfig | null;
    if (!config?.providerEnabled || config.platform !== 'android' || typeof config.iframeUrl !== 'string') {
      throw new Error('CPX Research is not available for this account or country yet.');
    }
    let parsed: URL;
    try { parsed = new URL(config.iframeUrl); }
    catch { throw new Error('CPX returned an invalid offerwall address.'); }
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'offers.cpx-research.com') {
      throw new Error('CPX returned an untrusted offerwall address.');
    }
    return parsed.toString();
  },
};
