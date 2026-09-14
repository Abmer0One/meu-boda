'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
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
  AlertCircle,
  Building2,
  Heart,
  Clock,
  CheckCircle2,
  XCircle
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
  const { user } = useAuth();
  const currentUserId = user?.id || (userRole === 'vendor' ? vendorId : null);

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

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-AO');
    } catch {
      return '';
    }
  };

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

    const myUid = currentUserId || (await supabase.auth.getUser()).data.user?.id;
    if (!myUid) return;

    const contentToSend = newMessage.trim();
    setNewMessage('');
    const msg = await ChatRepository.sendMessage(activeRoom.id, myUid, contentToSend);
    if (!msg) {
      setNewMessage(contentToSend);
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
    if (!activeRoom || !proposalTitle || proposalValue <= 0) return;

    setIsSendingProposal(true);
    try {
      const myUid = currentUserId || (await supabase.auth.getUser()).data.user?.id;
      if (!myUid) return;
      const vId = vendorId || activeRoom.vendor_id;

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
        vendor_id: vId,
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
      const myUid = currentUserId || (await supabase.auth.getUser()).data.user?.id;
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
      const myUid = currentUserId || (await supabase.auth.getUser()).data.user?.id;
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
                ? room.vendor_profile?.category || 'Serviço'
                : 'Casamento';

              return (
                <button
                  key={room.id}
                  onClick={() => {
                    setActiveRoom(room);
                    if (onRoomSelected) onRoomSelected(room.id);
                  }}
                  className={`w-full text-left p-3.5 border-b border-border-custom transition-all flex items-center gap-3 cursor-pointer ${
                    isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-secondary/20'
                  }`}
                >
                  <div className={`h-9 w-9 rounded-full shrink-0 flex items-center justify-center font-bold text-xs ${
                    isSelected ? 'bg-primary text-white' : 'bg-secondary/40 text-foreground/70'
                  }`}>
                    {userRole === 'client' 
                      ? (room.vendor_profile?.company_name?.[0]?.toUpperCase() || 'F')
                      : (room.event?.title?.[0]?.toUpperCase() || 'C')}
                  </div>
                  <div className="truncate flex-1">
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
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                  {userRole === 'client' 
                    ? (activeRoom.vendor_profile?.company_name?.[0]?.toUpperCase() || 'F')
                    : (activeRoom.event?.title?.[0]?.toUpperCase() || 'C')}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    {userRole === 'client' 
                      ? activeRoom.vendor_profile?.company_name || 'Fornecedor'
                      : activeRoom.event?.title || 'Casamento'}
                  </h4>
                  <p className="text-[11px] text-foreground/50 flex items-center gap-1.5">
                    {userRole === 'client' ? (
                      <>
                        <span className="font-medium text-primary">{activeRoom.vendor_profile?.category || 'Serviço'}</span>
                        <span>•</span>
                        <span>Fornecedor</span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-rose-600 dark:text-rose-400">Noivos / Cliente</span>
                        {activeRoom.event?.date && (
                          <>
                            <span>•</span>
                            <span>{new Date(activeRoom.event.date).toLocaleDateString('pt-AO')}</span>
                          </>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Vendor Contract Actions */}
              {userRole === 'vendor' && (
                <Button 
                  size="sm" 
                  leftIcon={<FileText className="h-3.5 w-3.5" />} 
                  onClick={handleOpenProposalModal}
                >
                  Criar Proposta
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
                  const isMe = Boolean(currentUserId && msg.sender_id === currentUserId);
                  const isProposal = msg.proposal_id !== null && msg.proposal;
                  const isVendorSender = msg.sender_id === activeRoom.vendor_id;

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      {/* Standard text message */}
                      {!isProposal ? (
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%] sm:max-w-[70%]`}>
                          {/* Sender identification label */}
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            {isMe ? (
                              <span className="text-[10px] font-semibold text-foreground/50">Você</span>
                            ) : isVendorSender ? (
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                                <Building2 className="h-3 w-3" />
                                <span>{activeRoom.vendor_profile?.company_name || 'Fornecedor'}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-bold tracking-wider">
                                  {activeRoom.vendor_profile?.category || 'Fornecedor'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                <Heart className="h-3 w-3 fill-current" />
                                <span>{activeRoom.event?.title || 'Cliente / Noivos'}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 uppercase font-bold tracking-wider">
                                  Noivos
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Message bubble */}
                          <div 
                            className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm break-words ${
                              isMe 
                                ? 'bg-primary text-white rounded-tr-none' 
                                : 'bg-card text-foreground rounded-tl-none border border-border-custom'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? 'text-white/70' : 'text-foreground/40'}`}>
                              <Clock className="h-2.5 w-2.5" />
                              <span>{formatTime(msg.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Contract Proposal Card UI */
                        <div className={`w-full max-w-[85%] sm:max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            {isMe ? (
                              <span className="text-[10px] font-semibold text-foreground/50">Você (Proposta Comercial)</span>
                            ) : (
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                                <Building2 className="h-3 w-3" />
                                <span>{activeRoom.vendor_profile?.company_name || 'Fornecedor'}</span>
                              </div>
                            )}
                          </div>

                          <Card className={`w-full overflow-hidden shadow-sm transition-all ${
                            isMe 
                              ? 'border border-primary/30 bg-card-bg rounded-2xl rounded-tr-none' 
                              : 'border-2 border-primary/40 bg-card-bg shadow-md rounded-2xl rounded-tl-none'
                          }`}>
                            <div className={`px-4 py-3 flex items-center justify-between border-b ${
                              isMe 
                                ? 'bg-primary/10 border-primary/20 text-primary' 
                                : 'bg-primary text-white border-primary/20'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Briefcase className={`h-4 w-4 ${isMe ? 'text-primary' : 'text-white'}`} />
                                <h5 className="font-bold text-xs">
                                  {isMe ? 'Sua Proposta Comercial Oficial' : 'Proposta Comercial Recebida'}
                                </h5>
                              </div>
                              <span className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full ${
                                msg.proposal?.status === 'Ativo' 
                                  ? isMe ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-emerald-500 text-white'
                                  : msg.proposal?.status === 'Recusado' 
                                  ? isMe ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-red-500 text-white'
                                  : isMe ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-white/20 text-white border border-white/30'
                              }`}>
                                {msg.proposal?.status}
                              </span>
                            </div>

                            <CardContent className="p-4 space-y-3 text-xs">
                              <div>
                                <p className="font-bold text-foreground text-sm">{msg.proposal?.service_title}</p>
                                <p className="text-[10px] text-foreground/50 mt-0.5">
                                  {isMe ? 'Criada em' : 'Recebida em'} {formatDate(msg.proposal?.created_at)}
                                </p>
                              </div>

                              <div className="flex justify-between items-center bg-primary/5 p-3 rounded-xl border border-primary/20">
                                <div>
                                  <span className="text-[10px] text-foreground/60 uppercase font-semibold block">Valor do Contrato</span>
                                  <span className="text-[10px] text-foreground/50">Pagamento faseado (50% / 50%)</span>
                                </div>
                                <span className="font-extrabold text-primary text-base sm:text-lg">
                                  {msg.proposal?.total_value.toLocaleString('pt-AO')} Kz
                                </span>
                              </div>

                              <div className="text-[10px] text-foreground/60 bg-secondary/10 p-2.5 rounded-lg space-y-1">
                                <p className="font-semibold text-foreground/75 mb-0.5">Plano de Pagamentos:</p>
                                <p>• 50% Sinal: {((msg.proposal?.total_value || 0) * 0.5).toLocaleString('pt-AO')} Kz</p>
                                <p>• 50% Final: {((msg.proposal?.total_value || 0) * 0.5).toLocaleString('pt-AO')} Kz</p>
                              </div>

                              {msg.proposal?.status === 'Ativo' && (
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                  <span>
                                    {isMe 
                                      ? 'Proposta aceite pelos noivos! Contrato ativo e sincronizado.' 
                                      : 'Contrato aprovado! O serviço foi adicionado ao orçamento do casamento.'}
                                  </span>
                                </div>
                              )}

                              {msg.proposal?.status === 'Recusado' && (
                                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                                  <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                                  <span>{isMe ? 'Proposta recusada pelo cliente.' : 'Proposta recusada por você.'}</span>
                                </div>
                              )}

                              {userRole === 'client' && msg.proposal?.status === 'Pendente' && (
                                <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-border-custom/50">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="w-full sm:w-auto text-error hover:bg-error/10 border-error/30 text-xs"
                                    onClick={() => handleDeclineProposal(msg.proposal!)}
                                  >
                                    <X className="h-3.5 w-3.5 mr-1" /> Recusar Proposta
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                                    onClick={() => handleApproveProposal(msg.proposal!)}
                                  >
                                    <Check className="h-3.5 w-3.5 mr-1" /> Aceitar e Contratar
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
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
