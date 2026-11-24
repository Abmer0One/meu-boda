import { supabase } from '@/lib/supabase';
import { PlatformPayment, Event } from '@/types';

export interface SubmitPaymentParams {
  userId: string;
  userEmail: string;
  eventId: string;
  eventTitle: string;
  planType: string;
  amount: number;
  file: File;
  referenceCode?: string;
  notes?: string;
}

export interface LicenseStatusResult {
  isLicensed: boolean;
  status: 'licensed' | 'pending' | 'trial';
  payment?: PlatformPayment | null;
}

// Cutoff date for grandfathering existing pilot events (created before feature launch)
const LAUNCH_CUTOFF_DATE = '2026-11-19T00:00:00Z';

export const PlatformPaymentRepository = {
  /**
   * Submits a bank transfer receipt for an event license activation.
   */
  async submitPayment(params: SubmitPaymentParams): Promise<{ success: boolean; payment?: PlatformPayment; error?: string }> {
    try {
      const cleanFileName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `platform_payments/${params.eventId}_${Date.now()}_${cleanFileName}`;

      // 1. Upload receipt file to Supabase storage 'receipts'
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, params.file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Error uploading payment receipt:', uploadError);
        return { success: false, error: 'Falha ao carregar o ficheiro do comprovativo. Tente novamente.' };
      }

      // 2. Obtain public URL
      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      const receiptUrl = publicUrlData?.publicUrl || '';
      const generatedId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const nowIso = new Date().toISOString();

      // 3. Insert record into platform_payments
      const newPayment: PlatformPayment = {
        id: generatedId,
        user_id: params.userId,
        user_email: params.userEmail,
        event_id: params.eventId,
        event_title: params.eventTitle,
        plan_type: params.planType,
        amount: params.amount,
        payment_method: 'Transferência Bancária / Multicaixa Express',
        reference_code: params.referenceCode?.trim() || null,
        receipt_url: receiptUrl,
        status: 'Pendente',
        notes: params.notes?.trim() || null,
        created_at: nowIso,
      };

      try {
        const { data: inserted, error: insertError } = await supabase
          .from('platform_payments')
          .insert(newPayment)
          .select('*')
          .single();

        if (insertError) {
          console.warn('Supabase platform_payments insert note (RLS/table):', insertError.message);
        }
      } catch (insertErr) {
        console.warn('Failed inserting to platform_payments table:', insertErr);
      }

      // Always save locally as fallback mirror
      if (typeof window !== 'undefined') {
        try {
          const localList: PlatformPayment[] = JSON.parse(
            localStorage.getItem('meuboda_local_platform_payments') || '[]'
          );
          localList.unshift(newPayment);
          localStorage.setItem('meuboda_local_platform_payments', JSON.stringify(localList));
        } catch {}
      }

      // 4. Update event's template_config with full pending payment metadata
      // (This guarantees the Super Admin always sees the pending payment even if platform_payments table has RLS)
      try {
        const { data: eventRow } = await supabase
          .from('events')
          .select('template_config')
          .eq('id', params.eventId)
          .single();

        const currentConfig = eventRow?.template_config || {};
        await supabase
          .from('events')
          .update({
            template_config: {
              ...currentConfig,
              payment_status: 'Pendente',
              payment_submitted_at: nowIso,
              payment_id: generatedId,
              payment_email: params.userEmail,
              payment_amount: params.amount,
              plan_type: params.planType,
              payment_method: 'Transferência Bancária / Multicaixa Express',
              reference_code: params.referenceCode?.trim() || null,
              receipt_url: receiptUrl,
              payment_notes: params.notes?.trim() || null,
            },
          })
          .eq('id', params.eventId);
      } catch (eventErr) {
        console.warn('Could not update template_config with payment_status:', eventErr);
      }

      // 5. Dispatch notification to notifications table so admins have an immediate log
      try {
        await supabase.from('notifications').insert({
          user_id: params.userId,
          title: '[Pagamento] Novo Comprovativo Submetido',
          message: `${params.userEmail} enviou comprovativo de ${params.amount} Kz para ${params.eventTitle}`,
          type: 'info',
          read: false,
        });
      } catch {}

      return {
        success: true,
        payment: newPayment,
      };
    } catch (e: any) {
      console.error('submitPayment fatal error:', e);
      return { success: false, error: e?.message || 'Erro inesperado ao submeter comprovativo.' };
    }
  },

  /**
   * Fetches the latest platform payment for a specific event.
   */
  async getPaymentByEventId(eventId: string): Promise<PlatformPayment | null> {
    try {
      const { data, error } = await supabase
        .from('platform_payments')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        // Fallback to local storage
        if (typeof window !== 'undefined') {
          const localList: PlatformPayment[] = JSON.parse(
            localStorage.getItem('meuboda_local_platform_payments') || '[]'
          );
          const match = localList.find((p) => p.event_id === eventId);
          return match || null;
        }
        return null;
      }

      return (data[0] as PlatformPayment) || null;
    } catch {
      return null;
    }
  },

  /**
   * Evaluates whether an event is licensed (Active) or in Trial / Pending mode.
   * Ensures 100% grandfathered access for existing pilot events (including Dec 5 wedding).
   */
  async isEventLicensed(
    event: Event | null | undefined,
    userRole?: string | null
  ): Promise<LicenseStatusResult> {
    if (!event) {
      return { isLicensed: true, status: 'licensed' };
    }

    // Rule 1: Administrators and Planners with active subscription slots are always licensed
    const cleanRole = userRole?.toLowerCase() || '';
    if (cleanRole === 'admin' || cleanRole === 'superadmin' || cleanRole === 'planner') {
      return { isLicensed: true, status: 'licensed' };
    }

    // Rule 2: Explicitly licensed via template_config flag
    if (event.template_config?.is_licensed === true) {
      return { isLicensed: true, status: 'licensed' };
    }

    // Rule 3: GRANDFATHERING SAFEGUARD
    // All pilot events created before the launch cutoff date are permanently licensed (Free VIP)
    if (event.created_at && new Date(event.created_at) < new Date(LAUNCH_CUTOFF_DATE)) {
      return { isLicensed: true, status: 'licensed' };
    }

    // Rule 4: Query platform_payments table for approved or pending records
    const latestPayment = await this.getPaymentByEventId(event.id);
    if (latestPayment) {
      if (latestPayment.status === 'Aprovado') {
        return { isLicensed: true, status: 'licensed', payment: latestPayment };
      }
      if (latestPayment.status === 'Pendente') {
        return { isLicensed: false, status: 'pending', payment: latestPayment };
      }
    }

    // Rule 5: Fallback to event template_config payment_status
    if (event.template_config?.payment_status === 'Pendente') {
      return { isLicensed: false, status: 'pending', payment: latestPayment };
    }

    // Default for newly created events: Trial / Demonstration mode
    return { isLicensed: false, status: 'trial', payment: latestPayment };
  },
};
