import { supabase } from '@/lib/supabase';
import { AppNotification } from '@/types';

export const NotificationRepository = {
  async getAll(userId: string): Promise<AppNotification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        if (error.code !== 'PGRST205' && error.code !== '42P01') {
          console.warn('Notification query warning:', error.message);
        }
        return [];
      }
      return Array.isArray(data) ? (data as AppNotification[]) : [];
    } catch (err) {
      console.warn('Error fetching notifications:', err);
      return [];
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        if (error.code !== 'PGRST205' && error.code !== '42P01') {
          console.warn('Notification count warning:', error.message);
        }
        return 0;
      }
      return typeof count === 'number' ? count : 0;
    } catch (err) {
      console.warn('Error counting unread notifications:', err);
      return 0;
    }
  },

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.warn('Error marking notification as read:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.warn('Error marking all notifications as read:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async create(notification: {
    user_id: string;
    title: string;
    message: string;
    type?: 'info' | 'payment' | 'proposal' | 'chat' | 'rsvp';
    link?: string | null;
  }): Promise<AppNotification | null> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.user_id,
          title: notification.title,
          message: notification.message,
          type: notification.type || 'info',
          link: notification.link || null,
          read: false,
        })
        .select()
        .single();

      if (error) {
        if (error.code !== 'PGRST205' && error.code !== '42P01') {
          console.error('Error creating notification:', error);
        }
        return null;
      }
      return data as AppNotification;
    } catch (err) {
      console.error('Failed to dispatch notification:', err);
      return null;
    }
  },
};
