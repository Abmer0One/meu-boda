import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Simple in-memory rate limiter per IP (30 requests per minute)
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequestCounts.get(ip);

  // Clean old entries periodically
  if (ipRequestCounts.size > 2000) {
    for (const [key, val] of ipRequestCounts.entries()) {
      if (now > val.resetTime) ipRequestCounts.delete(key);
    }
  }

  if (!entry || now > entry.resetTime) {
    ipRequestCounts.set(ip, { count: 1, resetTime: now + 60 * 1000 });
    return true;
  }

  if (entry.count >= 30) {
    return false; // Rate limit exceeded
  }

  entry.count += 1;
  return true;
}

export async function GET(request: Request) {
  // 1. IP extraction & rate limit check
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 'anonymous';

  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: 'Demasiados pedidos. Por favor aguarde um momento antes de tentar novamente.' },
      { status: 429 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim().toLowerCase() || null;
    const phone = searchParams.get('phone')?.trim() || null;

    // 2. Validate input formats to prevent probe attacks
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return NextResponse.json({ error: 'Formato de e-mail inválido.' }, { status: 400 });
    }

    if (phone && (phone.length > 20 || phone.replace(/\D/g, '').length < 6)) {
      return NextResponse.json({ error: 'Formato de telefone inválido.' }, { status: 400 });
    }

    let emailAvailable = true;
    let phoneAvailable = true;

    // 3. Primary Check: Execute RPC check_user_availability (Security Definer on auth.users)
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

    // 4. Fallback Check: Query public tables (e.g. vendor_profiles)
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
    // 5. Sanitize internal error messages - do not leak DB structure or system errors
    console.error('Error in check-availability route:', err?.message);
    return NextResponse.json(
      { emailAvailable: true, phoneAvailable: true, error: 'Erro ao verificar disponibilidade.' },
      { status: 500 }
    );
  }
}
