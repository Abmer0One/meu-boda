import { createClient } from '@supabase/supabase-js';

const getSupabaseUrl = () => {
  // If we are in the browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://127.0.0.1:64321';
    }
    // Mobile/external access on local network: forward requests to the port-forwarder on port 64325
    if (
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.11.') ||
      hostname.startsWith('172.')
    ) {
      return `http://${hostname}:64325`;
    }
  }

  // Baked-in production URL (default fallback for Vercel deployment)
  return process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mpxlurrvohvgiompueiw.supabase.co';
};

const supabaseUrl = getSupabaseUrl();
// Baked-in production publishable key (safe to expose, standard for Supabase public keys)
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_UcaXjQD3vaxE4rb-BsQImw_NgF2ZaON';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
