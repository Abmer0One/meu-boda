import { supabase } from '@/lib/supabase';

export interface UserAvailability {
  emailAvailable: boolean;
  phoneAvailable: boolean;
}

export const AuthRepository = {
  async checkAvailability(email?: string | null, phone?: string | null): Promise<UserAvailability> {
    const cleanEmail = email?.trim().toLowerCase() || null;
    const cleanPhone = phone?.trim() || null;

    if (!cleanEmail && !cleanPhone) {
      return { emailAvailable: true, phoneAvailable: true };
    }

    // 1. Try Direct Supabase RPC
    try {
      const { data, error } = await supabase.rpc('check_user_availability', {
        check_email: cleanEmail,
        check_phone: cleanPhone,
      });

      if (!error && data) {
        return {
          emailAvailable: data.email_available !== false,
          phoneAvailable: data.phone_available !== false,
        };
      }
    } catch (e) {
      // Non-fatal, try fallback
    }

    // 2. Try Internal Next.js API Route
    try {
      const params = new URLSearchParams();
      if (cleanEmail) params.set('email', cleanEmail);
      if (cleanPhone) params.set('phone', cleanPhone);

      const res = await fetch(`/api/auth/check-availability?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        return {
          emailAvailable: json.emailAvailable !== false,
          phoneAvailable: json.phoneAvailable !== false,
        };
      }
    } catch (e) {
      // Non-fatal
    }

    // 3. Fallback table check on vendor_profiles
    let emailAvail = true;
    let phoneAvail = true;

    if (cleanEmail && cleanEmail.length > 3) {
      const { data } = await supabase
        .from('vendor_profiles')
        .select('id')
        .ilike('email', cleanEmail)
        .maybeSingle();
      if (data) emailAvail = false;
    }

    if (cleanPhone) {
      const digits = cleanPhone.replace(/\D/g, '');
      if (digits.length >= 9) {
        const last9 = digits.slice(-9);
        const { data } = await supabase
          .from('vendor_profiles')
          .select('id')
          .ilike('phone', `%${last9}%`)
          .maybeSingle();
        if (data) phoneAvail = false;
      }
    }

    return {
      emailAvailable: emailAvail,
      phoneAvailable: phoneAvail,
    };
  },
};
