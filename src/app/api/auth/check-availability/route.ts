import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim().toLowerCase() || null;
    const phone = searchParams.get('phone')?.trim() || null;

    let emailAvailable = true;
    let phoneAvailable = true;

    // 1. Primary Check: Execute RPC check_user_availability (Security Definer on auth.users)
    try {
      const { data, error } = await supabase.rpc('check_user_availability', {
        check_email: email,
        check_phone: phone,
      });

      if (!error && data) {
        return NextResponse.json({
          emailAvailable: data.email_available !== false,
          phoneAvailable: data.phone_available !== false,
        });
      }
    } catch (rpcErr) {
      // Non-fatal, fallback to table checks
      console.warn('RPC check_user_availability error/not deployed:', rpcErr);
    }

    // 2. Fallback Check: Query public tables (e.g. vendor_profiles)
    if (email && email.length > 3) {
      const { data: vpEmail } = await supabase
        .from('vendor_profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle();

      if (vpEmail) {
        emailAvailable = false;
      }
    }

    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length >= 9) {
        const last9 = cleanPhone.slice(-9);
        const { data: vpPhone } = await supabase
          .from('vendor_profiles')
          .select('id')
          .ilike('phone', `%${last9}%`)
          .maybeSingle();

        if (vpPhone) {
          phoneAvailable = false;
        }
      }
    }

    return NextResponse.json({
      emailAvailable,
      phoneAvailable,
    });
  } catch (err: any) {
    console.error('Error in check-availability route:', err);
    return NextResponse.json(
      { emailAvailable: true, phoneAvailable: true, error: err.message },
      { status: 500 }
    );
  }
}
