import { supabase } from '@/lib/supabase';
import { VendorProfile, VendorService, ChatRoom, ChatMessage, VendorContract } from '@/types';

export const VendorProfileRepository = {
  async get(id: string): Promise<VendorProfile | null> {
    const { data, error } = await supabase
      .from('vendor_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching vendor profile:', error);
      return null;
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
      return null;
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
      return null;
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
      return null;
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
      return null;
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
      return false;
    }
    return true;
  }
};

export const ChatRepository = {
  async getRoomsForEvent(eventId: string): Promise<ChatRoom[]> {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*, vendor_profile:vendor_profiles(*)')
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
      .select('*, event:events(*)')
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
      .select('*, vendor_profile:vendor_profiles(*)')
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
      .select('*, vendor_profile:vendor_profiles(*)')
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
    return data as VendorContract;
  },

  async getContractsForVendor(vendorId: string): Promise<VendorContract[]> {
    const { data, error } = await supabase
      .from('vendor_contracts')
      .select('*, room:chat_rooms(*, event:events(*))')
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
  }
};
