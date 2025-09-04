import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalFeedback: number;
  pendingFeedback: number;
  resolvedFeedback: number;
  averageRating: number;
  responsesThisMonth: number;
  responsesThisWeek: number;
  totalQRCodes: number;
  activeQRCodes: number;
}

export const useDashboardStats = (refreshTrigger?: number) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalFeedback: 0,
    pendingFeedback: 0,
    resolvedFeedback: 0,
    averageRating: 0,
    responsesThisMonth: 0,
    responsesThisWeek: 0,
    totalQRCodes: 0,
    activeQRCodes: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get user's profile and branch
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('branch_id, role')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      const isAdmin = profile?.role === 'admin';
      const userBranchId = profile?.branch_id;

      // Fetch feedback stats
      let feedbackQuery = supabase.from('feedback').select('*');
      if (!isAdmin && userBranchId) {
        feedbackQuery = feedbackQuery.eq('branch_id', userBranchId);
      }
      
      const { data: feedback, error: feedbackError } = await feedbackQuery;
      if (feedbackError) throw feedbackError;

      // Fetch QR codes stats
      let qrQuery = supabase.from('qr_codes').select('*');
      if (!isAdmin) {
        qrQuery = qrQuery.eq('user_id', user.id);
      }
      
      const { data: qrCodes, error: qrError } = await qrQuery;
      if (qrError) throw qrError;

      // Calculate stats
      const now = new Date();
      const thisMonth = feedback?.filter(f => {
        const createdAt = new Date(f.created_at);
        return createdAt.getMonth() === now.getMonth() && 
               createdAt.getFullYear() === now.getFullYear();
      }) || [];

      const thisWeek = feedback?.filter(f => {
        const createdAt = new Date(f.created_at);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return createdAt >= weekAgo;
      }) || [];

      const totalFeedback = feedback?.length || 0;
      const pendingFeedback = feedback?.filter(f => f.status === 'pending').length || 0;
      const resolvedFeedback = feedback?.filter(f => f.status === 'resolved').length || 0;
      const averageRating = feedback?.length > 0 
        ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length 
        : 0;

      const totalQRCodes = qrCodes?.length || 0;
      const activeQRCodes = qrCodes?.filter(qr => qr.is_active).length || 0;

      setStats({
        totalFeedback,
        pendingFeedback,
        resolvedFeedback,
        averageRating: Math.round(averageRating * 10) / 10,
        responsesThisMonth: thisMonth.length,
        responsesThisWeek: thisWeek.length,
        totalQRCodes,
        activeQRCodes
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user, refreshTrigger]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const feedbackSubscription = supabase
      .channel('feedback_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'feedback' },
        () => fetchStats()
      )
      .subscribe();

    const qrSubscription = supabase
      .channel('qr_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'qr_codes' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      feedbackSubscription.unsubscribe();
      qrSubscription.unsubscribe();
    };
  }, [user]);

  return { stats, loading, error, refetch: fetchStats };
};