import { supabase } from '@/lib/supabase';
import { AppNotification } from '@/types';

export const NotificationRepository = {
  async getAll(userId: string): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      if (error.code !== 'PGRST205' && error.code !== '42P01') {
        console.error('Error fetching notifications:', error);
      }
      return [];
    }
    return data as AppNotification[];
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      if (error.code !== 'PGRST205' && error.code !== '42P01') {
        console.error('Error counting unread notifications:', error);
      }
      return 0;
    }
    return count || 0;
  },

  async markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
    return true;
  },

  async markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
    return true;
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
