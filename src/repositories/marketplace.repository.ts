import { supabase } from '@/lib/supabase';
import { VendorProfile, VendorService, ChatRoom, ChatMessage, VendorContract, PaymentInstallment } from '@/types';
import { BudgetRepository } from '@/repositories/budget.repository';
import { NotificationRepository } from '@/repositories/notification.repository';

export const VendorProfileRepository = {
  async get(id: string): Promise<VendorProfile | null> {
    const { data, error } = await supabase
      .from('vendor_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching vendor profile:', error);
      if (error.code === 'PGRST205') {
        console.warn("Tabela 'vendor_profiles' não encontrada no Supabase. Execute a migração SQL.");
      }
      return null;
    }
    return data as VendorProfile;
  },

  async upsert(profile: Partial<VendorProfile> & { id: string }): Promise<VendorProfile | null> {
    const { data, error } = await supabase
      .from('vendor_profiles')
      .upsert(profile, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting vendor profile:', error);
      if (error.code === 'PGRST205') {
        throw new Error("A tabela 'vendor_profiles' não foi encontrada na base de dados do Supabase. Por favor execute a migração SQL no SQL Editor do Supabase.");
      }
      throw new Error(error.message || 'Erro ao guardar dados do perfil.');
    }
    return data as VendorProfile;
  },

  async update(id: string, profile: Partial<Omit<VendorProfile, 'id' | 'created_at'>>): Promise<VendorProfile | null> {
    const { data, error } = await supabase
      .from('vendor_profiles')
      .update(profile)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vendor profile:', error);
      if (error.code === 'PGRST205') {
        throw new Error("A tabela 'vendor_profiles' não foi encontrada no Supabase. Execute a migração SQL.");
      }
      throw new Error(error.message || 'Erro ao atualizar perfil.');
    }
    return data as VendorProfile;
  },

  async create(profile: Omit<VendorProfile, 'created_at'>): Promise<VendorProfile | null> {
    const { data, error } = await supabase
      .from('vendor_profiles')
      .insert(profile)
      .select()
      .single();

    if (error) {
      console.error('Error creating vendor profile:', error);
      if (error.code === 'PGRST205') {
        throw new Error("A tabela 'vendor_profiles' não foi encontrada no Supabase. Execute a migração SQL.");
      }
      throw new Error(error.message || 'Erro ao criar perfil.');
    }
    return data as VendorProfile;
  },

  async list(category?: string): Promise<VendorProfile[]> {
    let query = supabase.from('vendor_profiles').select('*').eq('status', 'Aprovado');
    if (category && category !== 'Todos') {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('company_name', { ascending: true });
    if (error) {
      console.error('Error listing vendor profiles:', error);
      return [];
    }
    return data as VendorProfile[];
  }
};

export const VendorServiceRepository = {
  async getAll(vendorId: string): Promise<VendorService[]> {
    const { data, error } = await supabase
      .from('vendor_services')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('title', { ascending: true });

    if (error) {
      console.error('Error fetching vendor services:', error);
      return [];
    }
    return data as VendorService[];
  },

  async create(service: Omit<VendorService, 'id' | 'created_at'>): Promise<VendorService | null> {
    const { data, error } = await supabase
      .from('vendor_services')
      .insert(service)
      .select()
      .single();

    if (error) {
      console.error('Error creating vendor service:', error);
      if (error.code === 'PGRST205') {
        throw new Error("A tabela 'vendor_services' não foi encontrada no Supabase. Execute a migração SQL.");
      }
      throw new Error(error.message || 'Erro ao criar serviço.');
    }
    return data as VendorService;
  },

  async update(id: string, service: Partial<Omit<VendorService, 'id' | 'vendor_id' | 'created_at'>>): Promise<VendorService | null> {
    const { data, error } = await supabase
      .from('vendor_services')
      .update(service)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vendor service:', error);
      if (error.code === 'PGRST205') {
        throw new Error("A tabela 'vendor_services' não foi encontrada no Supabase. Execute a migração SQL.");
      }
      throw new Error(error.message || 'Erro ao atualizar serviço.');
    }
    return data as VendorService;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('vendor_services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vendor service:', error);
      if (error.code === 'PGRST205') {
        throw new Error("A tabela 'vendor_services' não foi encontrada no Supabase. Execute a migração SQL.");
      }
      throw new Error(error.message || 'Erro ao eliminar serviço.');
    }
    return true;
  }
};

export const ChatRepository = {
  async getRoomsForEvent(eventId: string): Promise<ChatRoom[]> {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*, vendor_profile:vendor_profiles(*), event:events(*)')
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching chat rooms for event:', error);
      return [];
    }
    return data as ChatRoom[];
  },

  async getRoomsForVendor(vendorId: string): Promise<ChatRoom[]> {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*, vendor_profile:vendor_profiles(*), event:events(*)')
      .eq('vendor_id', vendorId);

    if (error) {
      console.error('Error fetching chat rooms for vendor:', error);
      return [];
    }
    return data as ChatRoom[];
  },

  async getOrCreateRoom(eventId: string, vendorId: string): Promise<ChatRoom | null> {
    // Check if room exists
    const { data: existing, error: findError } = await supabase
      .from('chat_rooms')
      .select('*, vendor_profile:vendor_profiles(*), event:events(*)')
      .eq('event_id', eventId)
      .eq('vendor_id', vendorId)
      .maybeSingle();

    if (findError) {
      console.error('Error finding chat room:', findError);
    }

    if (existing) {
      return existing as ChatRoom;
    }

    // Create new room
    const { data: created, error: createError } = await supabase
      .from('chat_rooms')
      .insert({ event_id: eventId, vendor_id: vendorId })
      .select('*, vendor_profile:vendor_profiles(*), event:events(*)')
      .single();

    if (createError) {
      console.error('Error creating chat room:', createError);
      return null;
    }
    return created as ChatRoom;
  },

  async getMessages(roomId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*, proposal:vendor_contracts(*)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
    return data as ChatMessage[];
  },

  async sendMessage(roomId: string, senderId: string, content: string, proposalId?: string | null): Promise<ChatMessage | null> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: senderId,
        content,
        proposal_id: proposalId || null
      })
      .select('*, proposal:vendor_contracts(*)')
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

    // Trigger notification to the recipient in background
    (async () => {
      try {
        const { data: r } = await supabase
          .from('chat_rooms')
          .select('vendor_id, event:events(user_id)')
          .eq('id', roomId)
          .maybeSingle();

        if (r) {
          const clientUserId = (r.event as any)?.user_id;
          const vendorUserId = r.vendor_id;
          const recipientId = senderId === vendorUserId ? clientUserId : vendorUserId;
          const isSenderVendor = senderId === vendorUserId;

          if (recipientId && recipientId !== senderId) {
            await NotificationRepository.create({
              user_id: recipientId,
              title: isSenderVendor ? 'Nova Mensagem do Fornecedor' : 'Nova Mensagem do Cliente',
              message: content.length > 80 ? content.substring(0, 77) + '...' : content,
              type: 'chat',
              link: isSenderVendor ? '/admin/fornecedores' : '/admin/fornecedores/mensagens',
            });
          }
        }
      } catch (err) {
        console.error('Failed to notify message recipient:', err);
      }
    })();

    return data as ChatMessage;
  }
};

export const ContractRepository = {
  async create(contract: Omit<VendorContract, 'id' | 'created_at'>): Promise<VendorContract | null> {
    const { data, error } = await supabase
      .from('vendor_contracts')
      .insert(contract)
      .select()
      .single();

    if (error) {
      console.error('Error creating vendor contract:', error);
      return null;
    }

    // Trigger notification to the client
    (async () => {
      try {
        const { data: eventData } = await supabase
          .from('events')
          .select('user_id')
          .eq('id', contract.event_id)
          .maybeSingle();

        if (eventData?.user_id) {
          await NotificationRepository.create({
            user_id: eventData.user_id,
            title: 'Nova Proposta Recebida',
            message: `Recebeu uma proposta de orçamento para o serviço: "${contract.service_title}".`,
            type: 'proposal',
            link: '/admin/fornecedores',
          });
        }
      } catch (err) {
        console.error('Failed to notify client about contract proposal:', err);
      }
    })();

    return data as VendorContract;
  },

  async updateStatus(id: string, status: 'Pendente' | 'Ativo' | 'Recusado' | 'Concluido'): Promise<VendorContract | null> {
    const { data, error } = await supabase
      .from('vendor_contracts')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contract status:', error);
      return null;
    }

    // Trigger notification to the vendor when proposal accepted or declined
    (async () => {
      try {
        if (data?.vendor_id) {
          if (status === 'Ativo') {
            await NotificationRepository.create({
              user_id: data.vendor_id,
              title: 'Proposta Aceite pelo Cliente! 🎉',
              message: `A sua proposta para "${data.service_title}" foi aprovada e o contrato foi gerado.`,
              type: 'proposal',
              link: '/admin/fornecedores/contratos',
            });
          } else if (status === 'Recusado') {
            await NotificationRepository.create({
              user_id: data.vendor_id,
              title: 'Proposta Recusada',
              message: `A proposta para "${data.service_title}" não foi aceite pelo cliente.`,
              type: 'proposal',
              link: '/admin/fornecedores/contratos',
            });
          }
        }
      } catch (err) {
        console.error('Failed to notify vendor about proposal status update:', err);
      }
    })();

    return data as VendorContract;
  },

  async getContractsForVendor(vendorId: string): Promise<VendorContract[]> {
    const { data, error } = await supabase
      .from('vendor_contracts')
      .select('*, room:chat_rooms(*, event:events(*)), vendor_profile:vendor_profiles(*)')
      .eq('vendor_id', vendorId);

    if (error) {
      console.error('Error fetching contracts for vendor:', error);
      return [];
    }
    return data as unknown as VendorContract[];
  },

  async getContractsForEvent(eventId: string): Promise<VendorContract[]> {
    const { data, error } = await supabase
      .from('vendor_contracts')
      .select('*, room:chat_rooms(*, vendor_profile:vendor_profiles(*))')
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching contracts for event:', error);
      return [];
    }
    return data as unknown as VendorContract[];
  },

  async getContractsCountForVendorOnDate(vendorId: string, dateStr: string): Promise<number> {
    const { count, error } = await supabase
      .from('vendor_contracts')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .eq('event_date', dateStr)
      .eq('status', 'Ativo');

    if (error) {
      console.error('Error counting contracts for vendor on date:', error);
      return 0;
    }
    return count || 0;
  },

  async updateInstallments(id: string, installments: any[]): Promise<VendorContract | null> {
    const { data, error } = await supabase
      .from('vendor_contracts')
      .update({ payment_installments: installments })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contract installments:', error);
      return null;
    }
    return data as VendorContract;
  },

  async submitReceipt(
    contractId: string, 
    installmentIndex: number, 
    receiptUrl: string, 
    receiptName: string, 
    notes?: string
  ): Promise<VendorContract | null> {
    const { data: contract, error: fetchErr } = await supabase
      .from('vendor_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (fetchErr || !contract) {
      console.error('Error fetching contract for submitReceipt:', fetchErr);
      return null;
    }

    const installments: PaymentInstallment[] = [...(contract.payment_installments || [])];
    if (!installments[installmentIndex]) return null;

    installments[installmentIndex] = {
      ...installments[installmentIndex],
      status: 'UnderReview',
      receipt_url: receiptUrl,
      receipt_name: receiptName,
      submitted_at: new Date().toISOString(),
      rejection_reason: null,
      notes: notes || installments[installmentIndex].notes || null,
    };

    const updated = await this.updateInstallments(contractId, installments);

    // Notify vendor about receipt submission
    (async () => {
      try {
        await NotificationRepository.create({
          user_id: contract.vendor_id,
          title: 'Comprovativo de Pagamento Submetido',
          message: `O cliente submeteu o comprovativo da parcela #${installmentIndex + 1} (${contract.service_title || 'Serviço'}).`,
          type: 'payment',
          link: '/admin/fornecedores/contratos',
        });
      } catch (err) {
        console.error('Failed to notify vendor about receipt:', err);
      }
    })();

    return updated;
  },

  async confirmPayment(
    contractId: string, 
    installmentIndex: number, 
    eventId: string, 
    category?: string
  ): Promise<VendorContract | null> {
    const { data: contract, error: fetchErr } = await supabase
      .from('vendor_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (fetchErr || !contract) {
      console.error('Error fetching contract for confirmPayment:', fetchErr);
      return null;
    }

    const installments: PaymentInstallment[] = [...(contract.payment_installments || [])];
    if (!installments[installmentIndex]) return null;

    installments[installmentIndex] = {
      ...installments[installmentIndex],
      status: 'Paid',
      verified_at: new Date().toISOString(),
      rejection_reason: null,
    };

    const updated = await this.updateInstallments(contractId, installments);
    if (updated) {
      let targetCategory = category;
      if (!targetCategory || targetCategory === 'Serviços') {
        const { data: vp } = await supabase
          .from('vendor_profiles')
          .select('category')
          .eq('id', contract.vendor_id)
          .maybeSingle();
        if (vp?.category) {
          targetCategory = vp.category;
        }
      }

      await BudgetRepository.incrementPaidAmount(
        eventId, 
        targetCategory || 'Serviços', 
        installments[installmentIndex].amount
      );

      // Notify the couple/client that payment was confirmed
      (async () => {
        try {
          const { data: eventData } = await supabase
            .from('events')
            .select('user_id')
            .eq('id', eventId)
            .maybeSingle();

          if (eventData?.user_id) {
            await NotificationRepository.create({
              user_id: eventData.user_id,
              title: 'Pagamento Confirmado pelo Fornecedor! ✅',
              message: `O fornecedor confirmou o recebimento da parcela #${installmentIndex + 1} (${installments[installmentIndex].amount.toLocaleString('pt-AO')} Kz).`,
              type: 'payment',
              link: '/admin/fornecedores',
            });
          }
        } catch (err) {
          console.error('Failed to notify client about payment confirmation:', err);
        }
      })();
    }
    return updated;
  },

  async rejectPayment(
    contractId: string, 
    installmentIndex: number, 
    reason: string
  ): Promise<VendorContract | null> {
    const { data: contract, error: fetchErr } = await supabase
      .from('vendor_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (fetchErr || !contract) {
      console.error('Error fetching contract for rejectPayment:', fetchErr);
      return null;
    }

    const installments: PaymentInstallment[] = [...(contract.payment_installments || [])];
    if (!installments[installmentIndex]) return null;

    installments[installmentIndex] = {
      ...installments[installmentIndex],
      status: 'Rejected',
      rejection_reason: reason,
    };

    const updated = await this.updateInstallments(contractId, installments);

    // Notify client about rejection
    (async () => {
      try {
        if (contract.event_id) {
          const { data: eventData } = await supabase
            .from('events')
            .select('user_id')
            .eq('id', contract.event_id)
            .maybeSingle();

          if (eventData?.user_id) {
            await NotificationRepository.create({
              user_id: eventData.user_id,
              title: 'Comprovativo Rejeitado pelo Fornecedor',
              message: `O fornecedor rejeitou o comprovativo da parcela #${installmentIndex + 1}: "${reason}".`,
              type: 'payment',
              link: '/admin/fornecedores',
            });
          }
        }
      } catch (err) {
        console.error('Failed to notify client about receipt rejection:', err);
      }
    })();

    return updated;
  },

  async recordDirectPayment(
    contractId: string, 
    installmentIndex: number, 
    eventId: string, 
    category?: string, 
    receiptUrl?: string, 
    notes?: string
  ): Promise<VendorContract | null> {
    const { data: contract, error: fetchErr } = await supabase
      .from('vendor_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (fetchErr || !contract) {
      console.error('Error fetching contract for recordDirectPayment:', fetchErr);
      return null;
    }

    const installments: PaymentInstallment[] = [...(contract.payment_installments || [])];
    if (!installments[installmentIndex]) return null;

    installments[installmentIndex] = {
      ...installments[installmentIndex],
      status: 'Paid',
      receipt_url: receiptUrl || installments[installmentIndex].receipt_url || null,
      receipt_name: receiptUrl ? 'Comprovativo de Pagamento' : installments[installmentIndex].receipt_name || null,
      submitted_at: installments[installmentIndex].submitted_at || new Date().toISOString(),
      verified_at: new Date().toISOString(),
      rejection_reason: null,
      notes: notes || 'Pagamento registado e confirmado diretamente pelo fornecedor',
    };

    const updated = await this.updateInstallments(contractId, installments);
    if (updated) {
      let targetCategory = category;
      if (!targetCategory || targetCategory === 'Serviços') {
        const { data: vp } = await supabase
          .from('vendor_profiles')
          .select('category')
          .eq('id', contract.vendor_id)
          .maybeSingle();
        if (vp?.category) {
          targetCategory = vp.category;
        }
      }

      await BudgetRepository.incrementPaidAmount(
        eventId, 
        targetCategory || 'Serviços', 
        installments[installmentIndex].amount
      );

      // Notify the couple/client
      (async () => {
        try {
          const { data: eventData } = await supabase
            .from('events')
            .select('user_id')
            .eq('id', eventId)
            .maybeSingle();

          if (eventData?.user_id) {
            await NotificationRepository.create({
              user_id: eventData.user_id,
              title: 'Pagamento Registado pelo Fornecedor',
              message: `O fornecedor registou o pagamento da parcela #${installmentIndex + 1} (${installments[installmentIndex].amount.toLocaleString('pt-AO')} Kz).`,
              type: 'payment',
              link: '/admin/fornecedores',
            });
          }
        } catch (err) {
          console.error('Failed to notify client about recorded payment:', err);
        }
      })();
    }
    return updated;
  }
};
