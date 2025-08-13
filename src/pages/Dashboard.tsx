import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, MessageSquare, Users, TrendingUp, Settings, LogOut, Plus } from 'lucide-react';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { FeedbackList } from '@/components/FeedbackList';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalFeedback: number;
  pendingFeedback: number;
  averageRating: number;
  responsesThisMonth: number;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalFeedback: 0,
    pendingFeedback: 0,
    averageRating: 0,
    responsesThisMonth: 0
  });
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Get user's branch
      const { data: profile } = await supabase
        .from('profiles')
        .select('branch_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.branch_id) return;

      // Get feedback stats
      const { data: feedback, error } = await supabase
        .from('feedback')
        .select('rating, status, created_at')
        .eq('branch_id', profile.branch_id);

      if (error) {
        console.error('Error fetching stats:', error);
        return;
      }

      const now = new Date();
      const thisMonth = feedback?.filter(f => {
        const createdAt = new Date(f.created_at);
        return createdAt.getMonth() === now.getMonth() && 
               createdAt.getFullYear() === now.getFullYear();
      }) || [];

      const totalFeedback = feedback?.length || 0;
      const pendingFeedback = feedback?.filter(f => f.status === 'pending').length || 0;
      const averageRating = feedback?.length > 0 
        ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length 
        : 0;

      setStats({
        totalFeedback,
        pendingFeedback,
        averageRating: Math.round(averageRating * 10) / 10,
        responsesThisMonth: thisMonth.length
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user, refreshTrigger]);

  const handleSignOut = async () => {
    await signOut();
  };

  const refreshFeedback = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">FeedbackAI</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.user_metadata?.full_name || user.email}
            </span>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFeedback}</div>
              <p className="text-xs text-muted-foreground">
                All time responses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingFeedback}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting response
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating}/5</div>
              <p className="text-xs text-muted-foreground">
                Customer satisfaction
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.responsesThisMonth}</div>
              <p className="text-xs text-muted-foreground">
                New responses
              </p>
            </CardContent>
          </Card>
        </div>

        {/* QR Code Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Code Generator
                </CardTitle>
                <CardDescription>
                  Generate QR codes for customers to leave feedback
                </CardDescription>
              </div>
              <Button onClick={() => setShowQRGenerator(!showQRGenerator)}>
                <Plus className="h-4 w-4 mr-2" />
                {showQRGenerator ? 'Hide Generator' : 'Generate QR Code'}
              </Button>
            </div>
          </CardHeader>
          {showQRGenerator && (
            <CardContent>
              <QRCodeGenerator />
            </CardContent>
          )}
        </Card>

        {/* Feedback List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Feedback</CardTitle>
            <CardDescription>
              Latest customer feedback and reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FeedbackList onFeedbackUpdate={refreshFeedback} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;