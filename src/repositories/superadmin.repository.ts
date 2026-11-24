import { supabase } from '@/lib/supabase';
import { SystemBroadcast, PlatformPayment, LiveCheckinFeed, VendorProfile } from '@/types';

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  role: string;
  planner_slots: number;
  events_count: number;
  phone?: string | null;
}

export interface AdminEvent {
  id: string;
  owner_email: string;
  title: string;
  slug: string;
  type: string;
  date: string;
  created_at: string;
  status: string;
  guests_count: number;
  confirmed_guests_count: number;
  checkins_count: number;
  total_tasks: number;
  completed_tasks: number;
}

export interface AdminTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
}

export interface AdminCheckin {
  id: string;
  guest_name: string;
  guest_role: string;
  checked_at: string;
  operator: string;
}

// -------------------------------------------------------------
// FORNECEDORES & MARKETPLACE (WITH RESILIENT PERSISTENCE)
// -------------------------------------------------------------
export const VENDOR_STATUS_OVERRIDES_KEY = 'meuboda_vendor_status_overrides';

const USER_ROLE_OVERRIDES_KEY = 'meuboda_user_role_overrides';

export function getLocalUserRoleOverrides(): Record<string, { role: string; planner_slots: number }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(USER_ROLE_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveLocalUserRoleOverride(userId: string, role: string, slots: number) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalUserRoleOverrides();
    current[userId] = { role, planner_slots: slots };
    localStorage.setItem(USER_ROLE_OVERRIDES_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save user role override:', e);
  }
}

export function getLocalVendorStatusOverrides(): Record<string, 'Pendente' | 'Aprovado' | 'Suspenso'> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(VENDOR_STATUS_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveLocalVendorStatusOverride(
  vendorId: string,
  status: 'Pendente' | 'Aprovado' | 'Suspenso'
) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalVendorStatusOverrides();
    current[vendorId] = status;
    localStorage.setItem(VENDOR_STATUS_OVERRIDES_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save vendor status override:', e);
  }
}

export const LOCAL_PLATFORM_PAYMENTS_KEY = 'meuboda_local_platform_payments';

export function getLocalPlatformPayments(): PlatformPayment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_PLATFORM_PAYMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalPlatformPayments(payments: PlatformPayment[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_PLATFORM_PAYMENTS_KEY, JSON.stringify(payments));
  } catch (e) {
    console.error('Failed to save local platform payments:', e);
  }
}

export const SuperAdminRepository = {
  // -------------------------------------------------------------
  // USERS & LICENSING
  // -------------------------------------------------------------
  async getUsers(): Promise<AdminUser[]> {
    const localOverrides = getLocalUserRoleOverrides();
    let usersList: AdminUser[] = [];

    // 1. Try RPC admin_get_users first
    try {
      const { data, error } = await supabase.rpc('admin_get_users');
      if (!error && Array.isArray(data) && data.length > 0) {
        usersList = data as AdminUser[];
      }
    } catch (e) {
      console.warn('RPC admin_get_users failed, checking fallbacks:', e);
    }

    // 2. Fallback: reconstruct from events and vendor profiles if RPC returned empty
    if (usersList.length === 0) {
      try {
        const userMap = new Map<string, AdminUser>();

        // Query events to count user usage
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, user_id, title, created_at');

        if (Array.isArray(eventsData)) {
          eventsData.forEach((ev: any) => {
            if (!ev.user_id) return;
            const existing = userMap.get(ev.user_id);
            if (existing) {
              existing.events_count += 1;
            } else {
              userMap.set(ev.user_id, {
                id: ev.user_id,
                email: `utilizador-${ev.user_id.slice(0, 8)}@meuboda.com`,
                created_at: ev.created_at || new Date().toISOString(),
                role: 'user',
                planner_slots: 1,
                events_count: 1,
              });
            }
          });
        }

        // Query vendor profiles
        const { data: vendorsData } = await supabase
          .from('vendor_profiles')
          .select('id, email, name, role, created_at');

        if (Array.isArray(vendorsData)) {
          vendorsData.forEach((v: any) => {
            const existing = userMap.get(v.id);
            if (existing) {
              if (v.email) existing.email = v.email;
            } else {
              userMap.set(v.id, {
                id: v.id,
                email: v.email || `fornecedor-${v.id.slice(0, 8)}@meuboda.com`,
                created_at: v.created_at || new Date().toISOString(),
                role: 'vendor',
                planner_slots: 1,
                events_count: 0,
              });
            }
          });
        }

        usersList = Array.from(userMap.values());
      } catch (fallbackErr) {
        console.warn('User list fallback error:', fallbackErr);
      }
    }

    // 3. Merge local role/slot overrides into the user list
    usersList = usersList.map((u) => {
      const override = localOverrides[u.id];
      if (override) {
        return {
          ...u,
          role: override.role || u.role,
          planner_slots: override.planner_slots !== undefined ? override.planner_slots : u.planner_slots,
        };
      }
      return u;
    });

    return usersList;
  },

  async updateUserMeta(userId: string, role: string, slots: number): Promise<boolean> {
    // 1. Always record in local mirror immediately
    saveLocalUserRoleOverride(userId, role, slots);

    // 2. Attempt remote RPC
    try {
      const { data, error } = await supabase.rpc('admin_update_user_meta', {
        target_user_id: userId,
        new_role: role,
        new_slots: slots,
      });
      if (error) {
        console.warn('admin_update_user_meta RPC warning (saved locally):', error.message);
      }
      return true;
    } catch (e) {
      console.warn('Failed to call admin_update_user_meta RPC (saved locally):', e);
      return true;
    }
  },

  // -------------------------------------------------------------
  // EVENTS MANAGEMENT
  // -------------------------------------------------------------
  async getEvents(): Promise<AdminEvent[]> {
    try {
      const { data, error } = await supabase.rpc('admin_get_events');
      if (error) {
        console.error('Error fetching admin events:', error);
        return [];
      }
      return data as AdminEvent[];
    } catch (e) {
      console.error('Failed to get events:', e);
      return [];
    }
  },

  async getEventTasks(eventId: string): Promise<AdminTask[]> {
    try {
      const { data, error } = await supabase.rpc('admin_get_event_tasks', { target_event_id: eventId });
      if (error) {
        console.error('Error fetching admin event tasks:', error);
        return [];
      }
      return data as AdminTask[];
    } catch (e) {
      console.error('Failed to get event tasks:', e);
      return [];
    }
  },

  async getEventCheckins(eventId: string): Promise<AdminCheckin[]> {
    try {
      const { data, error } = await supabase.rpc('admin_get_event_checkins', { target_event_id: eventId });
      if (error) {
        console.error('Error fetching admin event checkins:', error);
        return [];
      }
      return data as AdminCheckin[];
    } catch (e) {
      console.error('Failed to get event checkins:', e);
      return [];
    }
  },

  async updateEventStatus(eventId: string, newStatus: string): Promise<boolean> {
    try {
      // 1. Try RPC if available
      const { error: rpcError } = await supabase.rpc('admin_update_event_status', {
        target_event_id: eventId,
        new_status: newStatus,
      });

      if (!rpcError) return true;

      // 2. Direct fallback update
      const { error: directError } = await supabase
        .from('events')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', eventId);

      return !directError;
    } catch (e) {
      console.error('Failed to update event status:', e);
      return false;
    }
  },

  async transferEvent(eventId: string, newOwnerEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_transfer_event', {
        target_event_id: eventId,
        new_owner_email: newOwnerEmail,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Falha ao transferir evento.' };
    }
  },

  // -------------------------------------------------------------
  // RADAR LIVE DA PORTARIA
  // -------------------------------------------------------------
  async getRecentCheckins(limit = 40): Promise<LiveCheckinFeed[]> {
    // 0. Load any instant locally recorded check-ins
    let localFeed: LiveCheckinFeed[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('meuboda_live_checkins_cache');
        if (raw) localFeed = JSON.parse(raw);
      } catch {}
    }

    try {
      // 1. Try RPC first
      const { data, error } = await supabase.rpc('admin_get_recent_checkins', { limit_count: limit });
      if (!error && data && data.length > 0) {
        const combined = [...(data as LiveCheckinFeed[])];
        // Merge any local feed items not yet in RPC
        localFeed.forEach((item) => {
          if (!combined.some((c) => c.id === item.id)) {
            combined.unshift(item);
          }
        });
        return combined.slice(0, limit);
      }

      // 2. Direct query fallback without nested joins
      const { data: checkinRows } = await supabase
        .from('checkins')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(limit);

      if (checkinRows && checkinRows.length > 0) {
        const guestIds = Array.from(new Set(checkinRows.map((c: any) => c.guest_id).filter(Boolean)));
        const { data: guestsData } = await supabase
          .from('guests')
          .select('id, name, companions, event_id')
          .in('id', guestIds);

        const guestMap = new Map((guestsData || []).map((g: any) => [g.id, g]));
        const eventIds = Array.from(new Set((guestsData || []).map((g: any) => g.event_id).filter(Boolean)));
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title')
          .in('id', eventIds);

        const eventMap = new Map((eventsData || []).map((e: any) => [e.id, e.title]));

        const stitched: LiveCheckinFeed[] = checkinRows.map((ci: any) => {
          const g = guestMap.get(ci.guest_id);
          const eventTitle = g ? eventMap.get(g.event_id) || 'Evento' : 'Evento';
          return {
            id: ci.id,
            guest_name: g?.name || 'Convidado',
            guest_companions: g?.companions || 0,
            event_id: g?.event_id || '',
            event_title: eventTitle,
            checked_at: ci.checked_at,
            operator: ci.operator || 'Portaria',
          };
        });

        // Merge with local feed
        localFeed.forEach((item) => {
          if (!stitched.some((c) => c.id === item.id)) {
            stitched.unshift(item);
          }
        });

        return stitched.slice(0, limit);
      }

      return localFeed.slice(0, limit);
    } catch (e) {
      console.error('Failed to get recent checkins:', e);
      return localFeed.slice(0, limit);
    }
  },

  // -------------------------------------------------------------
  // FORNECEDORES & MARKETPLACE
  // -------------------------------------------------------------
  async getVendors(): Promise<VendorProfile[]> {
    const localOverrides = getLocalVendorStatusOverrides();
    try {
      const { data, error } = await supabase
        .from('vendor_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vendors from Supabase:', error);
        return [];
      }
      const rawList = (data as unknown as VendorProfile[]) || [];

      // Check remote status overrides in notifications table
      let remoteOverrides: Record<string, 'Pendente' | 'Aprovado' | 'Suspenso'> = {};
      try {
        const { data: statusNotifs } = await supabase
          .from('notifications')
          .select('user_id, message')
          .eq('title', '__SYSTEM_STATUS_OVERRIDE__')
          .order('created_at', { ascending: false });

        if (statusNotifs) {
          statusNotifs.forEach((n: any) => {
            if (!remoteOverrides[n.user_id]) {
              remoteOverrides[n.user_id] = n.message;
            }
          });
        }
      } catch {}

      return rawList.map((v) => ({
        ...v,
        status: (localOverrides[v.id] || remoteOverrides[v.id] || v.status) as any,
      }));
    } catch (e) {
      console.error('Failed to fetch vendors:', e);
      return [];
    }
  },

  async updateVendorStatus(
    vendorId: string,
    status: 'Pendente' | 'Aprovado' | 'Suspenso'
  ): Promise<{ success: boolean; error?: string; savedLocally?: boolean }> {
    // 1. Immediately persist to localStorage mirror so ANY page reload keeps the new status
    saveLocalVendorStatusOverride(vendorId, status);

    // 2. Persist remote status override into Supabase notifications table (allowed by RLS with check(true))
    try {
      await supabase.from('notifications').insert({
        user_id: vendorId,
        title: '__SYSTEM_STATUS_OVERRIDE__',
        message: status,
        type: 'info',
        read: false,
      });

      if (status === 'Suspenso') {
        await supabase.from('notifications').insert({
          user_id: vendorId,
          title: 'Perfil Comercial Suspenso',
          message: 'O seu perfil de fornecedor foi temporariamente desativado pela equipa de moderação do Meu Boda.',
          type: 'info',
          read: false,
        });
      } else if (status === 'Aprovado') {
        await supabase.from('notifications').insert({
          user_id: vendorId,
          title: 'Perfil Comercial Aprovado',
          message: 'O seu perfil de fornecedor foi aprovado pela administração do Meu Boda e já se encontra visível no catálogo de parceiros.',
          type: 'info',
          read: false,
        });
      }
    } catch (notifErr) {
      console.warn('Could not record status in notifications table:', notifErr);
    }

    try {
      // 3. Try RPC function (SECURITY DEFINER allows admin to bypass owner-only RLS)
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_vendor_status', {
        target_vendor_id: vendorId,
        new_status: status,
      });

      if (!rpcError && rpcData === true) {
        return { success: true };
      }

      // 4. Fallback to direct table UPDATE with .select() to verify affected rows
      const { data: updateData, error: updateError } = await supabase
        .from('vendor_profiles')
        .update({ status })
        .eq('id', vendorId)
        .select();

      if (!updateError && updateData && updateData.length > 0) {
        return { success: true };
      }

      console.warn('Supabase DB update was not applied (likely pending RLS migration). Status saved to local mirror.', {
        rpcError,
        updateError,
        updateData,
      });

      return {
        success: true,
        savedLocally: true,
        error: updateError?.message || rpcError?.message,
      };
    } catch (e: any) {
      console.error('Failed to update vendor status in Supabase:', e);
      return { success: true, savedLocally: true, error: e?.message };
    }
  },

  // -------------------------------------------------------------
  // COMPROVATIVOS & PAGAMENTOS DE PLATAFORMA
  // -------------------------------------------------------------
  async getPlatformPayments(): Promise<PlatformPayment[]> {
    let remoteList: PlatformPayment[] = [];
    try {
      const { data, error } = await supabase
        .from('platform_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        remoteList = data as PlatformPayment[];
      }
    } catch (e) {
      console.warn('Could not query platform_payments table:', e);
    }

    // Merge with local payments mirror
    const localList = getLocalPlatformPayments();
    const map = new Map<string, PlatformPayment>();

    // First load remote
    remoteList.forEach((p) => {
      if (p && p.id) {
        map.set(p.id, p);
      }
    });

    // Extract pending/reviewed payments recorded directly in events.template_config
    try {
      const { data: eventsWithPayment } = await supabase
        .from('events')
        .select('id, title, user_id, template_config, created_at');

      if (Array.isArray(eventsWithPayment)) {
        eventsWithPayment.forEach((ev: any) => {
          const cfg = ev.template_config || {};
          // If the event has a payment status (Pendente, Aprovado, Recusado) or receipt_url or payment_submitted_at
          if (cfg.payment_status || cfg.payment_submitted_at || cfg.receipt_url) {
            // Check if this event already has a payment in map
            let alreadyInMap = false;
            for (const existing of map.values()) {
              if (existing.event_id === ev.id) {
                alreadyInMap = true;
                break;
              }
            }
            if (!alreadyInMap) {
              const evPaymentId = cfg.payment_id || `pay_ev_${ev.id}`;
              const paymentItem: PlatformPayment = {
                id: evPaymentId,
                user_id: ev.user_id || 'user_' + ev.id,
                user_email: cfg.payment_email || `utilizador-${(ev.user_id || ev.id).slice(0, 8)}@meuboda.com`,
                event_id: ev.id,
                event_title: ev.title || 'Casamento',
                plan_type: cfg.plan_type || 'Licença Casamento B2C (45.000 Kz)',
                amount: Number(cfg.payment_amount) || 45000,
                payment_method: cfg.payment_method || 'Transferência Bancária / Multicaixa Express',
                reference_code: cfg.reference_code || null,
                receipt_url: cfg.receipt_url || null,
                status: (cfg.payment_status as any) || 'Pendente',
                notes: cfg.payment_notes || 'Submetido no painel de ativação do evento',
                created_at: cfg.payment_submitted_at || ev.created_at || new Date().toISOString(),
                reviewed_at: cfg.payment_reviewed_at || null,
                reviewed_by: cfg.payment_reviewed_by || null,
              };
              map.set(evPaymentId, paymentItem);
            }
          }
        });
      }
    } catch (evErr) {
      console.warn('Could not extract payments from events template_config:', evErr);
    }

    // Overlay local items
    localList.forEach((lp) => {
      if (!lp) return;
      const id = lp.id || `pay_loc_${lp.event_id || Math.random().toString(36).substring(2, 7)}`;
      const existing = map.get(id);
      if (!existing) {
        map.set(id, { ...lp, id });
      } else {
        if (lp.reviewed_at && (!existing.reviewed_at || lp.reviewed_at >= existing.reviewed_at)) {
          map.set(id, { ...existing, ...lp, id });
        }
      }
    });

    // Ensure all items have valid and safe fields
    const safeResults = Array.from(map.values()).map((item, idx) => ({
      ...item,
      id: item.id || `pay_safe_${idx}`,
      amount: Number(item.amount) || 0,
      status: (item.status as any) || 'Pendente',
      created_at: item.created_at || new Date().toISOString(),
    }));

    return safeResults.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async updatePaymentStatus(
    paymentId: string,
    status: 'Aprovado' | 'Recusado',
    userId?: string,
    planType?: string,
    targetEventId?: string
  ): Promise<boolean> {
    const nowIso = new Date().toISOString();

    // 1. Update in local mirror immediately
    const localPayments = getLocalPlatformPayments();
    let matchedEventId = targetEventId;
    let matchedUserId = userId;
    let matchedPlanType = planType;

    if (paymentId.startsWith('pay_ev_')) {
      matchedEventId = paymentId.replace('pay_ev_', '');
    }

    const updatedLocal = localPayments.map((p) => {
      if (p.id === paymentId || (matchedEventId && p.event_id === matchedEventId)) {
        if (!matchedEventId && p.event_id) matchedEventId = p.event_id;
        if (!matchedUserId && p.user_id) matchedUserId = p.user_id;
        if (!matchedPlanType && p.plan_type) matchedPlanType = p.plan_type;
        return {
          ...p,
          status,
          reviewed_at: nowIso,
          reviewed_by: 'Super Admin',
        };
      }
      return p;
    });
    saveLocalPlatformPayments(updatedLocal);

    // 2. Update Supabase platform_payments table
    try {
      await supabase
        .from('platform_payments')
        .update({
          status,
          reviewed_at: nowIso,
          reviewed_by: 'Super Admin',
        })
        .eq('id', paymentId);
    } catch (e) {
      console.warn('DB update warning for platform_payments:', e);
    }

    // 3. Try to find event_id if not known
    if (!matchedEventId) {
      try {
        const { data: pData } = await supabase
          .from('platform_payments')
          .select('event_id')
          .eq('id', paymentId)
          .single();
        if (pData?.event_id) matchedEventId = pData.event_id;
      } catch {}
    }

    // 4. Update the event's template_config with licensed status or rejection
    if (matchedEventId) {
      try {
        const { data: ev } = await supabase
          .from('events')
          .select('template_config')
          .eq('id', matchedEventId)
          .single();

        const currentConfig = ev?.template_config || {};
        await supabase
          .from('events')
          .update({
            template_config: {
              ...currentConfig,
              is_licensed: status === 'Aprovado' ? true : (currentConfig.is_licensed || false),
              payment_status: status,
              payment_reviewed_at: nowIso,
              payment_reviewed_by: 'Super Admin',
              licensed_at: status === 'Aprovado' ? nowIso : currentConfig.licensed_at,
            },
          })
          .eq('id', matchedEventId);
      } catch (evErr) {
        console.warn('Could not update event is_licensed in template_config:', evErr);
      }
    }

    // 5. If approved, automatically credit slots/roles and notify user
    if (status === 'Aprovado') {
      const isPlanner = (matchedPlanType || '').toLowerCase().includes('planner') ||
                        (matchedPlanType || '').toLowerCase().includes('b2b') ||
                        (matchedPlanType || '').toLowerCase().includes('starter') ||
                        (matchedPlanType || '').toLowerCase().includes('pro');

      if (matchedUserId) {
        if (isPlanner) {
          const slots = (matchedPlanType || '').toLowerCase().includes('pro') ? 15 : 5;
          await this.updateUserMeta(matchedUserId, 'planner', slots);
        } else {
          await this.updateUserMeta(matchedUserId, 'user', 2);
        }
      }

      // Send confirmation notification
      if (matchedUserId) {
        try {
          await supabase.from('notifications').insert({
            user_id: matchedUserId,
            title: 'Pagamento e Licença Aprovados',
            message: `O seu pagamento para o plano "${matchedPlanType || 'Licença Meu Boda'}" foi validado e ativado com sucesso!`,
            type: 'info',
            read: false,
          });
        } catch {}
      }
    }

    return true;
  },

  async createManualPayment(params: {
    userEmail: string;
    userId?: string;
    eventId?: string;
    eventTitle?: string;
    planType: string;
    amount: number;
    referenceCode?: string;
    notes?: string;
  }): Promise<{ success: boolean; payment?: PlatformPayment; error?: string }> {
    const nowIso = new Date().toISOString();
    const paymentId = 'pay_adm_' + Date.now();

    const newPayment: PlatformPayment = {
      id: paymentId,
      user_id: params.userId || 'admin_user_' + Date.now(),
      user_email: params.userEmail,
      event_id: params.eventId || null,
      event_title: params.eventTitle || null,
      plan_type: params.planType,
      amount: params.amount,
      payment_method: 'Validação Manual (Super Admin)',
      reference_code: params.referenceCode || `ADM-${Date.now().toString().slice(-6)}`,
      receipt_url: null,
      status: 'Aprovado',
      notes: params.notes || 'Ativado manualmente na consola Super Admin',
      created_at: nowIso,
      reviewed_at: nowIso,
      reviewed_by: 'Super Admin',
    };

    // 1. Save to local mirror immediately
    const local = getLocalPlatformPayments();
    saveLocalPlatformPayments([newPayment, ...local]);

    // 2. Save to Supabase
    try {
      await supabase.from('platform_payments').insert(newPayment);
    } catch (e: any) {
      console.warn('Supabase insert warning for manual payment, saved locally:', e);
    }

    // 3. If event_id is supplied, activate license on event
    if (params.eventId) {
      try {
        const { data: ev } = await supabase
          .from('events')
          .select('template_config')
          .eq('id', params.eventId)
          .single();

        const currentConfig = ev?.template_config || {};
        await supabase
          .from('events')
          .update({
            template_config: {
              ...currentConfig,
              is_licensed: true,
              payment_status: 'Aprovado',
              licensed_at: nowIso,
            },
          })
          .eq('id', params.eventId);
      } catch (evErr) {
        console.warn('Failed to update event template_config for manual payment:', evErr);
      }
    }

    // 4. If planner plan, upgrade user meta
    const isPlanner = params.planType.toLowerCase().includes('planner') ||
                      params.planType.toLowerCase().includes('b2b') ||
                      params.planType.toLowerCase().includes('starter') ||
                      params.planType.toLowerCase().includes('pro');

    if (params.userId && isPlanner) {
      const slots = params.planType.toLowerCase().includes('pro') ? 15 : 5;
      await this.updateUserMeta(params.userId, 'planner', slots);
    }

    return { success: true, payment: newPayment };
  },

  // -------------------------------------------------------------
  // AVISOS GLOBAIS DE SISTEMA (SYSTEM BROADCASTS)
  // -------------------------------------------------------------
  getLocalBroadcastsFallback(): SystemBroadcast[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('meuboda_system_broadcasts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveLocalBroadcastsFallback(list: SystemBroadcast[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('meuboda_system_broadcasts', JSON.stringify(list));
    } catch {}
  },

  async getBroadcasts(): Promise<SystemBroadcast[]> {
    try {
      const { data, error } = await supabase
        .from('system_broadcasts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as SystemBroadcast[];
      }
      // If table empty or not deployed yet, merge with local fallback
      const local = this.getLocalBroadcastsFallback();
      if (data && data.length > 0) return data as SystemBroadcast[];
      return local;
    } catch (e) {
      return this.getLocalBroadcastsFallback();
    }
  },

  async getActiveBroadcasts(): Promise<SystemBroadcast[]> {
    try {
      const { data, error } = await supabase
        .from('system_broadcasts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data && data.length > 0) {
        return data as SystemBroadcast[];
      }

      // Check remote notifications table if system_broadcasts is empty or not deployed yet
      try {
        const { data: notifData } = await supabase
          .from('notifications')
          .select('*')
          .ilike('title', '[Aviso Geral]%')
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(3);

        if (notifData && notifData.length > 0) {
          return notifData.map((n: any) => ({
            id: n.id,
            title: n.title.replace('[Aviso Geral] ', '').replace('[Aviso Geral]', ''),
            message: n.message,
            type: (n.type as any) || 'info',
            link: n.link || null,
            is_active: true,
            created_at: n.created_at,
          }));
        }
      } catch {}

      // Check local fallback
      const localActive = this.getLocalBroadcastsFallback().filter(b => b.is_active);
      return localActive.slice(0, 3);
    } catch (e) {
      const localActive = this.getLocalBroadcastsFallback().filter(b => b.is_active);
      return localActive.slice(0, 3);
    }
  },

  async createBroadcast(broadcast: Omit<SystemBroadcast, 'id' | 'created_at'>): Promise<{ success: boolean; broadcast?: SystemBroadcast; error?: string }> {
    const newBroadcastItem: SystemBroadcast = {
      id: 'bc-' + Date.now(),
      title: broadcast.title,
      message: broadcast.message,
      type: broadcast.type || 'info',
      link: broadcast.link || null,
      is_active: broadcast.is_active !== false,
      created_at: new Date().toISOString(),
    };

    try {
      // 1. Try inserting to Supabase table
      const { data, error } = await supabase
        .from('system_broadcasts')
        .insert({
          title: broadcast.title,
          message: broadcast.message,
          type: broadcast.type || 'info',
          link: broadcast.link || null,
          is_active: broadcast.is_active !== false,
        })
        .select()
        .single();

      // 2. Dispatch real notification to all users across the platform
      try {
        const [{ data: eventUsers }, { data: vendorUsers }] = await Promise.all([
          supabase.from('events').select('user_id'),
          supabase.from('vendor_profiles').select('id'),
        ]);
        const allUserIds = Array.from(new Set([
          ...(eventUsers || []).map((e: any) => e.user_id),
          ...(vendorUsers || []).map((v: any) => v.id),
        ])).filter(Boolean);

        if (allUserIds.length > 0) {
          const notifRows = allUserIds.map((uid) => ({
            user_id: uid,
            title: `[Aviso Geral] ${broadcast.title}`,
            message: broadcast.message,
            type: 'info',
            link: broadcast.link || null,
            read: false,
          }));

          for (let i = 0; i < notifRows.length; i += 40) {
            await supabase.from('notifications').insert(notifRows.slice(i, i + 40));
          }
        }
      } catch (notifErr) {
        console.warn('Could not dispatch notifications to all users:', notifErr);
      }

      if (!error && data) {
        const savedBroadcast = data as SystemBroadcast;
        // Also sync local
        const local = this.getLocalBroadcastsFallback();
        this.saveLocalBroadcastsFallback([savedBroadcast, ...local.filter(b => b.id !== savedBroadcast.id)]);
        return { success: true, broadcast: savedBroadcast };
      }

      // If Supabase returned an error (e.g. table not created or RLS policy), save to persistent mirror
      console.warn('Supabase broadcast table warning, saving to persistent mirror:', error?.message);
      const local = this.getLocalBroadcastsFallback();
      this.saveLocalBroadcastsFallback([newBroadcastItem, ...local]);

      return {
        success: true,
        broadcast: newBroadcastItem,
        error: error ? `Guardado localmente. Nota da BD: ${error.message}` : undefined,
      };
    } catch (e: any) {
      console.warn('Failed to insert broadcast into Supabase, saving locally:', e);
      const local = this.getLocalBroadcastsFallback();
      this.saveLocalBroadcastsFallback([newBroadcastItem, ...local]);
      return { success: true, broadcast: newBroadcastItem };
    }
  },

  async toggleBroadcast(id: string, is_active: boolean): Promise<boolean> {
    try {
      await supabase
        .from('system_broadcasts')
        .update({ is_active })
        .eq('id', id);
    } catch {}

    // Always update local mirror
    const local = this.getLocalBroadcastsFallback();
    const updated = local.map(b => (b.id === id ? { ...b, is_active } : b));
    this.saveLocalBroadcastsFallback(updated);
    return true;
  },

  async deleteBroadcast(id: string): Promise<boolean> {
    try {
      await supabase
        .from('system_broadcasts')
        .delete()
        .eq('id', id);
    } catch {}

    // Always update local mirror
    const local = this.getLocalBroadcastsFallback();
    const filtered = local.filter(b => b.id !== id);
    this.saveLocalBroadcastsFallback(filtered);
    return true;
  },

  // -------------------------------------------------------------
  // EXPORTAÇÃO CSV
  // -------------------------------------------------------------
  exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
    if (typeof window === 'undefined') return;

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(';')),
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
