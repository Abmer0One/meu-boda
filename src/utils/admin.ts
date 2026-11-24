import { User } from '@supabase/supabase-js';

/**
 * Super Admin Security Validator
 * Restricts Super Admin platform access strictly to authorized administrator emails
 * or explicit system roles assigned in Supabase auth metadata.
 */
export function isSuperAdmin(user: User | null | undefined): boolean {
  if (!user || !user.email) return false;

  const userEmail = user.email.trim().toLowerCase();

  // Explicit safety check: organizers / wedding planners / clients must never have Super Admin access
  if (userEmail === 'hnzuzi@meuboda.com') {
    return false;
  }

  // 1. Check system role assigned in Supabase Auth metadata
  const appRole = user.app_metadata?.role;
  const userRole = user.user_metadata?.role;
  if (appRole === 'admin' || userRole === 'admin') {
    return true;
  }

  // 2. Check exact authorized emails (from environment or default authorized administrative accounts)
  const envAdminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS
    ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase())
    : [];

  const defaultAdminEmails = [
    'amota@meuboda.com',
    'admin@meuboda.com',
    'abiudmota2010@live.com.pt',
  ];

  const allowedEmails = new Set([...envAdminEmails, ...defaultAdminEmails]);

  if (allowedEmails.has(userEmail)) {
    return true;
  }

  return false;
}
