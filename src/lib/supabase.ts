import { createClient } from '@supabase/supabase-js';

const getSupabaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Prioritize production URL if it is set and not a local dev URL
  if (
    envUrl &&
    !envUrl.includes('127.0.0.1') &&
    !envUrl.includes('localhost') &&
    !envUrl.includes('192.168.') &&
    !envUrl.includes('10.11.')
  ) {
    return envUrl;
  }

  // Client-side dynamic resolution for local development
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://127.0.0.1:64321';
    }
    // Mobile/external access on local network: forward requests to the port-forwarder on port 64325
    return `http://${hostname}:64325`;
  }

  return envUrl || 'http://127.0.0.1:64321';
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
