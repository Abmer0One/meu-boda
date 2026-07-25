'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ChatRoom, ChatMessage, VendorContract, Event, VendorProfile } from '@/types';
import { ChatRepository, ContractRepository } from '@/repositories/marketplace.repository';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { 
  Send, 
  FileText, 
  Check, 
  X, 
  Briefcase, 
  DollarSign, 
  Calendar,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface ChatTabProps {
  userRole: 'client' | 'vendor';
  eventId?: string; // Required for clients
  vendorId?: string; // Required for vendors
  preselectedRoomId?: string | null;
  onRoomSelected?: (roomId: string) => void;
}

export default function ChatTab({ 
  userRole, 
  eventId, 
  vendorId, 
  preselectedRoomId,
  onRoomSelected
}: ChatTabProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Proposal Modal (Vendor Only)
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalValue, setProposalValue] = useState(0);
  const [isSendingProposal, setIsSendingProposal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const senderId = userRole === 'client' ? (eventId ? rooms[0]?.event?.user_id : null) : vendorId;

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load active chat rooms
  const loadRooms = async () => {
    setLoadingRooms(true);
    try {
      if (userRole === 'client' && eventId) {
        const fetched = await ChatRepository.getRoomsForEvent(eventId);
        setRooms(fetched);
        
        // Handle preselection
        if (preselectedRoomId) {
          const matched = fetched.find(r => r.id === preselectedRoomId);
          if (matched) setActiveRoom(matched);
        } else if (fetched.length > 0 && !activeRoom) {
          setActiveRoom(fetched[0]);
        }
      } else if (userRole === 'vendor' && vendorId) {
        const fetched = await ChatRepository.getRoomsForVendor(vendorId);
        setRooms(fetched);
        
        // Handle preselection
        if (preselectedRoomId) {
          const matched = fetched.find(r => r.id === preselectedRoomId);
          if (matched) setActiveRoom(matched);
        } else if (fetched.length > 0 && !activeRoom) {
          setActiveRoom(fetched[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, vendorId, preselectedRoomId]);

  // Load messages for the active room
  const loadMessages = async () => {
    if (!activeRoom) return;
    setLoadingMessages(true);
    try {
      const fetched = await ChatRepository.getMessages(activeRoom.id);
      setMessages(fetched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadMessages();
    
    if (!activeRoom) return;

    // Realtime subscription for messages
    const channel = supabase
      .channel(`room-${activeRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${activeRoom.id}`
        },
        async (payload) => {
          // If the message has a proposal, fetch it with full join
          const msgId = payload.new.id;
          const { data, error } = await supabase
            .from('chat_messages')
            .select('*, proposal:vendor_contracts(*)')
            .eq('id', msgId)
            .single();
          
          if (!error && data) {
            setMessages((prev) => [...prev, data as ChatMessage]);
          } else {
            setMessages((prev) => [...prev, payload.new as ChatMessage]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vendor_contracts'
        },
        () => {
          // If contract status updates, reload all messages to refresh proposal card UI
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeRoom || !newMessage.trim()) return;

    const myUid = (await supabase.auth.getUser()).data.user?.id;
    if (!myUid) return;

    const msg = await ChatRepository.sendMessage(activeRoom.id, myUid, newMessage);
    if (msg) {
      setNewMessage('');
    }
  };

  // Vendor Creates Contract Proposal
  const handleOpenProposalModal = () => {
    setProposalTitle('');
    setProposalValue(0);
    setProposalModalOpen(true);
  };

  const handleSendProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !proposalTitle || proposalValue <= 0 || !vendorId) return;

    setIsSendingProposal(true);
    try {
      const myUid = (await supabase.auth.getUser()).data.user?.id;
      if (!myUid) return;

      // Get event date
      const { data: eventData } = await supabase
        .from('events')
        .select('date')
        .eq('id', activeRoom.event_id)
        .single();
      
      const eventDate = eventData?.date ? eventData.date.split('T')[0] : new Date().toISOString().split('T')[0];

      // Create contract record
      const contract = await ContractRepository.create({
        room_id: activeRoom.id,
        vendor_id: vendorId,
        event_id: activeRoom.event_id,
        service_title: proposalTitle,
        total_value: proposalValue,
        payment_installments: [
          { percentage: 50, amount: proposalValue * 0.5, status: 'Pending' },
          { percentage: 50, amount: proposalValue * 0.5, status: 'Pending' }
        ],
        pdf_url: null,
        status: 'Pendente',
        event_date: eventDate
      });

      if (contract) {
        // Send chat message linking proposal
        await ChatRepository.sendMessage(
          activeRoom.id,
          myUid,
          `Propôs um contrato comercial: "${proposalTitle}" no valor de ${proposalValue.toLocaleString('pt-AO')} Kz.`,
          contract.id
        );
        setProposalModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingProposal(false);
    }
  };

  // Client Approves Contract
  const handleApproveProposal = async (contract: VendorContract) => {
    if (!activeRoom) return;
    try {
      const myUid = (await supabase.auth.getUser()).data.user?.id;
      if (!myUid) return;

      // 1. Update contract status to Active
      await ContractRepository.updateStatus(contract.id, 'Ativo');

      // 2. Fetch vendor profile details
      const { data: vendorProfile } = await supabase
        .from('vendor_profiles')
        .select('*')
        .eq('id', activeRoom.vendor_id)
        .single();

      // 3. Create entry in client manual vendors table for budget sync
      if (vendorProfile) {
        await supabase.from('vendors').insert({
          event_id: activeRoom.event_id,
          name: vendorProfile.company_name,
          category: vendorProfile.category,
          contract_value: contract.total_value,
          status: 'Ativo'
        });

        // Sync with budgets table
        const { data: existingBudget } = await supabase
          .from('budgets')
          .select('*')
          .eq('event_id', activeRoom.event_id)
          .eq('category', vendorProfile.category)
          .maybeSingle();

        if (existingBudget) {
          await supabase
            .from('budgets')
            .update({
              estimated_amount: Number(existingBudget.estimated_amount) + Number(contract.total_value)
            })
            .eq('id', existingBudget.id);
        } else {
          await supabase.from('budgets').insert({
            event_id: activeRoom.event_id,
            category: vendorProfile.category,
            estimated_amount: contract.total_value,
            paid_amount: 0
          });
        }
      }

      // 4. Send chat alert
      await ChatRepository.sendMessage(
        activeRoom.id,
        myUid,
        `Contrato aprovado! O serviço "${contract.service_title}" foi contratado e adicionado ao casamento.`
      );
      
      loadMessages();
    } catch (err) {
      console.error(err);
    }
  };

  // Client Declines Contract
  const handleDeclineProposal = async (contract: VendorContract) => {
    if (!activeRoom) return;
    try {
      const myUid = (await supabase.auth.getUser()).data.user?.id;
      if (!myUid) return;

      await ContractRepository.updateStatus(contract.id, 'Recusado');
      await ChatRepository.sendMessage(
        activeRoom.id,
        myUid,
        `Proposta de contrato "${contract.service_title}" foi recusada.`
      );
      
      loadMessages();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 border border-border-custom rounded-xl overflow-hidden min-h-[500px] bg-card-bg">
      {/* ROOMS LIST PANEL (LEFT) */}
      <div className="md:col-span-1 border-r border-border-custom bg-secondary/10 flex flex-col">
        <div className="p-4 border-b border-border-custom bg-card-bg">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            Conversas Ativas
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[450px]">
          {loadingRooms ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : rooms.length > 0 ? (
            rooms.map((room) => {
              const isSelected = activeRoom?.id === room.id;
              const title = userRole === 'client' 
                ? room.vendor_profile?.company_name || 'Fornecedor'
                : room.event?.title || 'Casamento';
              const category = userRole === 'client' 
                ? room.vendor_profile?.category 
                : 'Casamento';

              return (
                <button
                  key={room.id}
                  onClick={() => {
                    setActiveRoom(room);
                    if (onRoomSelected) onRoomSelected(room.id);
                  }}
                  className={`w-full text-left p-4 border-b border-border-custom transition-all flex items-center justify-between cursor-pointer ${
                    isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-secondary/20'
                  }`}
                >
                  <div className="truncate pr-2">
                    <h4 className="font-bold text-sm truncate text-foreground">{title}</h4>
                    <span className="text-[10px] text-foreground/50 uppercase tracking-wider font-semibold">
                      {category}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <p className="text-xs text-foreground/50 text-center py-12 italic">
              Nenhuma conversa iniciada.
            </p>
          )}
        </div>
      </div>

      {/* MESSAGES & INTERACTIVE CHAT PANEL (RIGHT) */}
      <div className="md:col-span-2 flex flex-col h-[500px] bg-card-bg justify-between">
        {activeRoom ? (
          <>
            {/* Active Header */}
            <div className="p-4 border-b border-border-custom flex items-center justify-between bg-card-bg">
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  {userRole === 'client' 
                    ? activeRoom.vendor_profile?.company_name 
                    : activeRoom.event?.title}
                </h4>
                <p className="text-[10px] text-foreground/50">
                  {userRole === 'client' ? activeRoom.vendor_profile?.category : 'Cliente'}
                </p>
              </div>

              {/* Vendor Contract Actions */}
              {userRole === 'vendor' && (
                <Button 
                  size="sm" 
                  leftIcon={<FileText className="h-3.5 w-3.5" />} 
                  onClick={handleOpenProposalModal}
                >
                  Proposta
                </Button>
              )}
            </div>

            {/* Messages Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[350px]">
              {loadingMessages ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => {
                  const isMe = msg.sender_id === senderId;
                  const isProposal = msg.proposal_id !== null && msg.proposal;

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      {/* Standard text message */}
                      {!isProposal ? (
                        <div 
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isMe 
                              ? 'bg-primary text-white rounded-tr-none' 
                              : 'bg-secondary/20 text-foreground rounded-tl-none border border-border-custom/50'
                          }`}
                        >
                          {msg.content}
                        </div>
                      ) : (
                        /* Contract Proposal Card UI */
                        <Card className="border border-primary/30 max-w-[85%] bg-card-bg shadow-sm overflow-hidden">
                          <div className="bg-primary/5 px-4 py-3 border-b border-primary/20 flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-primary" />
                            <h5 className="font-bold text-xs text-primary">Proposta Comercial Oficial</h5>
                          </div>
                          <CardContent className="p-4 space-y-3 text-xs">
                            <div>
                              <p className="font-bold text-foreground">{msg.proposal?.service_title}</p>
                              <p className="text-[10px] text-foreground/50 mt-0.5">Criada em {new Date(msg.proposal?.created_at || '').toLocaleDateString('pt-AO')}</p>
                            </div>

                            <div className="flex justify-between items-center bg-secondary/15 p-2 rounded-lg border border-border-custom/50">
                              <span className="text-[10px] text-foreground/60 uppercase font-semibold">Valor Total</span>
                              <span className="font-bold text-primary text-sm">
                                {msg.proposal?.total_value.toLocaleString('pt-AO')} Kz
                              </span>
                            </div>

                            {/* Status and Action Buttons */}
                            <div className="pt-2 flex items-center justify-between border-t border-border-custom/50">
                              <span className="text-[10px] uppercase font-bold tracking-wider">
                                Estado: {' '}
                                <span className={`font-extrabold ${
                                  msg.proposal?.status === 'Ativo' 
                                    ? 'text-success' 
                                    : msg.proposal?.status === 'Recusado' 
                                    ? 'text-error' 
                                    : 'text-warning'
                                }`}>
                                  {msg.proposal?.status}
                                </span>
                              </span>

                              {/* Client Action Triggers */}
                              {userRole === 'client' && msg.proposal?.status === 'Pendente' && (
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-error hover:bg-error/10 border-error/20"
                                    onClick={() => handleDeclineProposal(msg.proposal!)}
                                  >
                                    <X className="h-3 w-3" /> Recusar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleApproveProposal(msg.proposal!)}
                                  >
                                    <Check className="h-3 w-3" /> Aceitar
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-foreground/50 text-center italic py-12">
                  Escreva uma mensagem para iniciar o contacto comercial.
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-border-custom flex gap-2 bg-card-bg">
              <Input
                placeholder="Escreva a sua mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-secondary/10 border-border-custom rounded-xl"
              />
              <Button type="submit" size="sm" className="p-3 rounded-xl">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <AlertCircle className="h-8 w-8 text-foreground/25 mb-2" />
            <p className="text-sm font-semibold text-foreground/75">Selecione uma conversa</p>
            <p className="text-xs text-foreground/50 mt-1">
              Escolha uma conversa na lista ao lado para começar a comunicar.
            </p>
          </div>
        )}
      </div>

      {/* GENERATE PROPOSAL MODAL (Vendor Only) */}
      <Dialog
        isOpen={proposalModalOpen}
        onClose={() => setProposalModalOpen(false)}
        title="Gerar Proposta Comercial"
      >
        <form onSubmit={handleSendProposal} className="space-y-4">
          <Input
            label="Título do Serviço"
            placeholder="ex: Cobertura de Fotografia Completa"
            value={proposalTitle}
            onChange={(e) => setProposalTitle(e.target.value)}
            required
          />

          <Input
            label="Valor Total (Kz)"
            type="number"
            value={proposalValue}
            onChange={(e) => setProposalValue(Number(e.target.value))}
            required
          />

          <div className="bg-secondary/10 p-3 rounded-xl border border-border-custom/50 text-[10px] text-foreground/60 space-y-1">
            <p className="font-bold text-xs text-foreground mb-1">Estrutura de Pagamento Padrão</p>
            <p>• 50% Sinal (A adjudicação do contrato)</p>
            <p>• 50% Restante (Na véspera do casamento)</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setProposalModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSendingProposal}>
              Enviar Proposta
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
