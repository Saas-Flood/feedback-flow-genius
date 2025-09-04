import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { QrCode, MessageSquare, Users, TrendingUp, Settings, LogOut, Plus, Globe, Activity, CheckCircle, Clock } from 'lucide-react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { FeedbackList } from '@/components/FeedbackList';
import { IntelligentAnalytics } from '@/components/IntelligentAnalytics';
import FeedbackFormSettings from '@/components/FeedbackFormSettings';
import BranchManagement from '@/components/BranchManagement';
import LanguageSelector from '@/components/LanguageSelector';
import { useLanguageDetection } from '@/hooks/useLanguageDetection';
import { useTranslation } from '@/hooks/useTranslation';
import { Settings as SettingsComponent } from '@/components/Settings';
import { PricingCard } from '@/components/PricingCard';
import { useToast } from '@/hooks/use-toast';

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

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { subscriptionTier } = useSubscription();
  const { toast } = useToast();
  const language = useLanguageDetection();
  const { translatePageContent, isTranslating } = useTranslation();
  const { stats, loading: statsLoading, error: statsError, refetch } = useDashboardStats();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showTranslate, setShowTranslate] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  const refreshFeedback = () => {
    setRefreshTrigger(prev => prev + 1);
    refetch();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleTranslateClick = () => {
    if (subscriptionTier !== 'pro') {
      setShowPricingModal(true);
      return;
    }
    setShowTranslate(!showTranslate);
  };

  const handleLanguageChange = (lang: string) => {
    if (subscriptionTier !== 'pro') {
      setShowPricingModal(true);
      return;
    }
    setSelectedLanguage(lang);
    translatePageContent(lang);
  };

  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'analytics':
        return <IntelligentAnalytics />;
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
      case 'branches':
        return <BranchManagement />;
      case 'form-settings':
        return <FeedbackFormSettings />;
      case 'settings':
        return <SettingsComponent />;
      default:
        return (
          <div className="space-y-6">
            {/* Enhanced Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsLoading ? '...' : stats.totalFeedback}</div>
                  <p className="text-xs text-muted-foreground">All time responses</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Week</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsLoading ? '...' : stats.responsesThisWeek}</div>
                  <p className="text-xs text-muted-foreground">New responses</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsLoading ? '...' : `${stats.averageRating}/5`}</div>
                  <p className="text-xs text-muted-foreground">Customer satisfaction</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">QR Codes</CardTitle>
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsLoading ? '...' : `${stats.activeQRCodes}/${stats.totalQRCodes}`}</div>
                  <p className="text-xs text-muted-foreground">Active codes</p>
                </CardContent>
              </Card>
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Feedback</CardTitle>
                  <Clock className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">{statsLoading ? '...' : stats.pendingFeedback}</div>
                  <p className="text-xs text-muted-foreground">Awaiting response</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">{statsLoading ? '...' : stats.resolvedFeedback}</div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </CardContent>
              </Card>
            </div>

            {/* Real-time Status Indicator */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${statsLoading ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                <span className="text-sm text-muted-foreground">
                  {statsLoading ? 'Updating...' : 'Live data'} • Last updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Refresh
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveSection('qr-codes')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    QR Codes
                  </CardTitle>
                  <CardDescription>Generate and manage QR codes</CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveSection('analytics')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    AI Analytics
                  </CardTitle>
                  <CardDescription>Intelligent insights from feedback</CardDescription>
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
                onClick={handleTranslateClick}
                className="flex items-center gap-2"
                disabled={isTranslating}
              >
                <Globe className="h-4 w-4" />
                {isTranslating ? 'Translating...' : 'Translate'}
                {subscriptionTier !== 'pro' && (
                  <Badge variant="secondary" className="ml-1 text-xs">Pro</Badge>
                )}
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
          {showTranslate && subscriptionTier === 'pro' && (
            <div className="border-b bg-muted/50 p-4">
              <LanguageSelector 
                selectedLanguage={selectedLanguage}
                onLanguageChange={handleLanguageChange}
              />
            </div>
          )}

          {/* Pricing Modal */}
          <Dialog open={showPricingModal} onOpenChange={setShowPricingModal}>
            <DialogContent className="max-w-5xl">
              <DialogHeader>
                <DialogTitle>Upgrade to Pro Plan</DialogTitle>
                <DialogDescription>
                  Translation features are only available for Pro plan subscribers. Choose your plan to get access to multi-language support.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-6">
                <PricingCard />
              </div>
            </DialogContent>
          </Dialog>

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