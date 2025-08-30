import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { QrCode, MessageSquare, Users, TrendingUp, Settings, LogOut, Plus, Globe } from 'lucide-react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { FeedbackList } from '@/components/FeedbackList';
import { TeamManagement } from '@/components/TeamManagement';
import { TaskManagement } from '@/components/TaskManagement';
import FeedbackFormSettings from '@/components/FeedbackFormSettings';
import BranchManagement from '@/components/BranchManagement';
import LanguageSelector from '@/components/LanguageSelector';
import { useLanguageDetection } from '@/hooks/useLanguageDetection';
import { useTranslation } from '@/hooks/useTranslation';
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
  const language = useLanguageDetection();
  const { translatePageContent, isTranslating } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    totalFeedback: 0,
    pendingFeedback: 0,
    averageRating: 0,
    responsesThisMonth: 0
  });
  const [activeSection, setActiveSection] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showTranslate, setShowTranslate] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

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

  const renderContent = () => {
    switch (activeSection) {
      case 'teams':
        return <TeamManagement />;
      case 'tasks':
        return <TaskManagement />;
      case 'qr-codes':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">QR Code Management</h2>
              <p className="text-muted-foreground">Generate and manage QR codes for feedback collection</p>
            </div>
            <QRCodeGenerator />
          </div>
        );
      case 'feedback':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Feedback Management</h2>
              <p className="text-muted-foreground">View and manage customer feedback</p>
            </div>
            <FeedbackList onFeedbackUpdate={refreshFeedback} />
          </div>
        );
      case 'analytics':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Analytics</h2>
              <p className="text-muted-foreground">Detailed analytics and insights</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalFeedback}</div>
                  <p className="text-xs text-muted-foreground">All time responses</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingFeedback}</div>
                  <p className="text-xs text-muted-foreground">Awaiting response</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.averageRating}/5</div>
                  <p className="text-xs text-muted-foreground">Customer satisfaction</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.responsesThisMonth}</div>
                  <p className="text-xs text-muted-foreground">New responses</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 'branches':
        return <BranchManagement />;
      case 'form-settings':
        return <FeedbackFormSettings />;
      case 'settings':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Settings</h2>
              <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Settings panel coming soon...</p>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalFeedback}</div>
                  <p className="text-xs text-muted-foreground">All time responses</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingFeedback}</div>
                  <p className="text-xs text-muted-foreground">Awaiting response</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.averageRating}/5</div>
                  <p className="text-xs text-muted-foreground">Customer satisfaction</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.responsesThisMonth}</div>
                  <p className="text-xs text-muted-foreground">New responses</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveSection('qr-codes')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    QR Codes
                  </CardTitle>
                  <CardDescription>Generate and manage QR codes</CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveSection('teams')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Teams
                  </CardTitle>
                  <CardDescription>Manage teams and members</CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveSection('tasks')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Tasks
                  </CardTitle>
                  <CardDescription>Assign and track tasks</CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* Recent Feedback */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Feedback</CardTitle>
                <CardDescription>Latest customer feedback and reviews</CardDescription>
              </CardHeader>
              <CardContent>
                <FeedbackList onFeedbackUpdate={refreshFeedback} />
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        
        <main className="flex-1">
          {/* Header */}
          <header className="border-b bg-card h-16 flex items-center px-6">
            <SidebarTrigger className="mr-4" />
            
            <div className="flex items-center gap-2 flex-1">
              <MessageSquare className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">FeedbackAI</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowTranslate(!showTranslate)}
                className="flex items-center gap-2"
                disabled={isTranslating}
              >
                <Globe className="h-4 w-4" />
                {isTranslating ? 'Translating...' : 'Translate'}
              </Button>
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
          </header>

          {/* Language Selector */}
          {showTranslate && (
            <div className="border-b bg-muted/50 p-4">
              <LanguageSelector 
                selectedLanguage={selectedLanguage}
                onLanguageChange={(lang) => {
                  setSelectedLanguage(lang);
                  translatePageContent(lang);
                }}
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;