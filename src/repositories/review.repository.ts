import { supabase } from '@/lib/supabase';
import { VendorReview } from '@/types';

export const ReviewRepository = {
  async getByVendor(vendorId: string): Promise<VendorReview[]> {
    const { data, error } = await supabase
      .from('vendor_reviews')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code !== 'PGRST205' && error.code !== '42P01') {
        console.error('Error fetching vendor reviews:', error);
      }
      return [];
    }
    return data as VendorReview[];
  },

  async getVendorStats(vendorId: string): Promise<{ average: number; count: number }> {
    const reviews = await this.getByVendor(vendorId);
    if (!reviews || reviews.length === 0) {
      return { average: 5.0, count: 0 };
    }
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    const average = Number((sum / reviews.length).toFixed(1));
    return { average, count: reviews.length };
  },

  async create(review: Omit<VendorReview, 'id' | 'created_at'>): Promise<VendorReview | null> {
    const { data, error } = await supabase
      .from('vendor_reviews')
      .insert(review)
      .select()
      .single();

    if (error) {
      console.error('Error creating review:', error);
      throw new Error(error.message || 'Erro ao enviar avaliação.');
    }
    return data as VendorReview;
  },
};
