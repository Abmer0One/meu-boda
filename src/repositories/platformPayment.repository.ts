import { supabase } from '@/lib/supabase';
import { PlatformPayment, Event } from '@/types';
import { CANVA_CONFIG_BLOCK_TITLE, persistCanvaConfig } from '@/utils/canvaConfig';

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

export const PLATFORM_PAYMENTS_STORAGE_PATH = 'platform_payments_data/all_payments.json';
export const PLATFORM_PAYMENT_BLOCK_TITLE = '__platform_payment_record__';

/**
 * Downloads the global payments master JSON from Supabase Storage 'receipts' bucket.
 * This is accessible across all devices, browsers, and mobile phones.
 */
export async function fetchCloudPaymentsFromStorage(): Promise<PlatformPayment[]> {
  try {
    const { data, error } = await supabase.storage
      .from('receipts')
      .download(PLATFORM_PAYMENTS_STORAGE_PATH);

    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed as PlatformPayment[];
      }
    }
  } catch (err) {
    // Non-fatal, try fallback via public URL
  }

  try {
    const { data: pubData } = supabase.storage
      .from('receipts')
      .getPublicUrl(PLATFORM_PAYMENTS_STORAGE_PATH);

    if (pubData?.publicUrl) {
      const res = await fetch(`${pubData.publicUrl}?t=${Date.now()}`);
      if (res.ok) {
        const parsed = await res.json();
        if (Array.isArray(parsed)) {
          return parsed as PlatformPayment[];
        }
      }
    }
  } catch {}

  return [];
}

/**
 * Uploads/upserts the unified payments array to Supabase Storage 'receipts' bucket.
 * This ensures that approvals or submissions made on any device immediately sync to all devices.
 */
export async function saveCloudPaymentsToStorage(payments: PlatformPayment[]): Promise<boolean> {
  try {
    const jsonBlob = new Blob([JSON.stringify(payments, null, 2)], {
      type: 'application/json',
    });

    const { error } = await supabase.storage
      .from('receipts')
      .upload(PLATFORM_PAYMENTS_STORAGE_PATH, jsonBlob, {
        upsert: true,
        contentType: 'application/json',
        cacheControl: '0',
      });

    if (error) {
      console.warn('Notice uploading payments to storage sync:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Failed to save payments to storage:', e);
    return false;
  }
}

export const PlatformPaymentRepository = {
  /**
   * Submits a bank transfer receipt for an event license activation.
   * Persists multi-layered to:
   * 1. Supabase Storage receipts/ (for the file and for global cloud json sync)
   * 2. Supabase event_info_blocks (__platform_payment_record__ and __canva_template_config__)
   * 3. Supabase notifications table
   * 4. Supabase platform_payments table (if schema exists)
   * 5. Local mirror cache
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

      // 3. Construct clean PlatformPayment record
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

      // 4. Persist to Global Cloud Storage (Cross-device sync master)
      try {
        const cloudList = await fetchCloudPaymentsFromStorage();
        const mergedCloud = [newPayment, ...cloudList.filter((p) => p.id !== generatedId && p.event_id !== params.eventId)];
        await saveCloudPaymentsToStorage(mergedCloud);
      } catch (cloudErr) {
        console.warn('Cloud storage sync warning on submitPayment:', cloudErr);
      }

      // 5. Persist to event_info_blocks table (Database level persistence)
      try {
        const { data: existingBlock } = await supabase
          .from('event_info_blocks')
          .select('id')
          .eq('event_id', params.eventId)
          .eq('title', PLATFORM_PAYMENT_BLOCK_TITLE)
          .maybeSingle();

        if (existingBlock?.id) {
          await supabase
            .from('event_info_blocks')
            .update({ content: JSON.stringify(newPayment) })
            .eq('id', existingBlock.id);
        } else {
          await supabase.from('event_info_blocks').insert({
            event_id: params.eventId,
            title: PLATFORM_PAYMENT_BLOCK_TITLE,
            content: JSON.stringify(newPayment),
            sort_order: 9998,
          });
        }
      } catch (blockErr) {
        console.warn('Could not save payment to event_info_blocks:', blockErr);
      }

      // 6. Update event's Canva config block with pending status
      try {
        await persistCanvaConfig(params.eventId, {
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
        });
      } catch (canvaErr) {
        console.warn('Could not update canvaConfig with payment:', canvaErr);
      }

      // 7. Insert to platform_payments table if it exists
      try {
        await supabase.from('platform_payments').insert(newPayment);
      } catch {}

      // 8. Always save locally as fallback mirror
      if (typeof window !== 'undefined') {
        try {
          const localList: PlatformPayment[] = JSON.parse(
            localStorage.getItem('meuboda_local_platform_payments') || '[]'
          );
          localList.unshift(newPayment);
          localStorage.setItem('meuboda_local_platform_payments', JSON.stringify(localList));
        } catch {}
      }

      // 9. Dispatch notification to notifications table
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
   * Fetches the latest platform payment for a specific event using all cloud layers.
   */
  async getPaymentByEventId(eventId: string): Promise<PlatformPayment | null> {
    if (!eventId) return null;

    // 1. Check Global Cloud Storage sync master
    try {
      const cloudList = await fetchCloudPaymentsFromStorage();
      const cloudMatch = cloudList.find((p) => p && p.event_id === eventId);
      if (cloudMatch) return cloudMatch;
    } catch {}

    // 2. Check event_info_blocks table
    try {
      const { data: block } = await supabase
        .from('event_info_blocks')
        .select('content')
        .eq('event_id', eventId)
        .eq('title', PLATFORM_PAYMENT_BLOCK_TITLE)
        .maybeSingle();

      if (block?.content) {
        const parsed = JSON.parse(block.content);
        if (parsed && (parsed.id || parsed.status)) {
          return parsed as PlatformPayment;
        }
      }
    } catch {}

    // 3. Check event's canva config block
    try {
      const { data: canvaBlock } = await supabase
        .from('event_info_blocks')
        .select('content')
        .eq('event_id', eventId)
        .eq('title', CANVA_CONFIG_BLOCK_TITLE)
        .maybeSingle();

      if (canvaBlock?.content) {
        const cfg = JSON.parse(canvaBlock.content);
        if (cfg.payment_status || cfg.payment_submitted_at || cfg.is_licensed) {
          const stitched: PlatformPayment = {
            id: cfg.payment_id || `pay_canva_${eventId}`,
            user_id: 'user_' + eventId,
            user_email: cfg.payment_email || '',
            event_id: eventId,
            event_title: '',
            plan_type: cfg.plan_type || 'Licença Casamento',
            amount: Number(cfg.payment_amount) || 45000,
            payment_method: cfg.payment_method || 'Multicaixa / Transferência',
            reference_code: cfg.reference_code || null,
            receipt_url: cfg.receipt_url || null,
            status: cfg.is_licensed ? 'Aprovado' : (cfg.payment_status || 'Pendente'),
            notes: cfg.payment_notes || null,
            created_at: cfg.payment_submitted_at || new Date().toISOString(),
            reviewed_at: cfg.payment_reviewed_at || (cfg.is_licensed ? cfg.licensed_at : null),
            reviewed_by: cfg.payment_reviewed_by || (cfg.is_licensed ? 'Super Admin' : null),
          };
          return stitched;
        }
      }
    } catch {}

    // 4. Check platform_payments table if exists
    try {
      const { data, error } = await supabase
        .from('platform_payments')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        return data[0] as PlatformPayment;
      }
    } catch {}

    // 5. Local storage fallback
    if (typeof window !== 'undefined') {
      try {
        const localList: PlatformPayment[] = JSON.parse(
          localStorage.getItem('meuboda_local_platform_payments') || '[]'
        );
        const match = localList.find((p) => p && p.event_id === eventId);
        if (match) return match;
      } catch {}
    }

    return null;
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

    // Rule 4: Query cloud payments and blocks for approved or pending records
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
