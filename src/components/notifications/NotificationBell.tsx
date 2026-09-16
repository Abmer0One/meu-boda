'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { NotificationRepository } from '@/repositories/notification.repository';
import { AppNotification } from '@/types';
import {
  Bell,
  CheckCheck,
  CreditCard,
  MessageSquare,
  FileText,
  Users,
  Info,
  ExternalLink,
  Loader2,
} from 'lucide-react';

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const [list, count] = await Promise.all([
        NotificationRepository.getAll(user.id),
        NotificationRepository.getUnreadCount(user.id),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // Supabase Realtime subscription for instant alert
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    if (!user || unreadCount === 0) return;
    setLoading(true);
    try {
      await NotificationRepository.markAllAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClickItem = async (notif: AppNotification) => {
    if (!notif.read) {
      await NotificationRepository.markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `Há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Há ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Ontem';
    return `Há ${days} dias`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CreditCard className="h-4 w-4 text-emerald-500" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4 text-primary" />;
      case 'proposal':
        return <FileText className="h-4 w-4 text-accent" />;
      case 'rsvp':
        return <Users className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-foreground/65 hover:text-primary hover:bg-secondary/40 transition-colors cursor-pointer focus:outline-none"
        title="Notificações"
        aria-label="Abrir central de notificações"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border-custom bg-card-bg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-custom px-4 py-3 bg-secondary/20">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">Notificações</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                  {unreadCount} novas
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                Marcar todas lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border-custom/50">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleClickItem(notif)}
                  className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer text-left ${
                    !notif.read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-secondary/30'
                  }`}
                >
                  <div className="mt-0.5 rounded-xl bg-background p-2 border border-border-custom/50 shrink-0">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`text-xs truncate ${!notif.read ? 'font-bold text-foreground' : 'font-semibold text-foreground/80'}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-foreground/45 shrink-0">
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/65 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {!notif.read && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="h-8 w-8 text-foreground/20 mb-2" />
                <p className="text-xs font-semibold text-foreground/75">Nenhuma notificação</p>
                <p className="text-[10px] text-foreground/50 mt-0.5">
                  Será alertado sempre que houver novidades sobre orçamentos, mensagens ou pagamentos.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border-custom px-4 py-2 bg-secondary/10 text-center">
            <span className="text-[10px] text-foreground/45">
              Central de Alertas em Tempo Real • Meu Boda
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
