import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building, 
  QrCode, 
  BarChart3, 
  MapPin, 
  Users, 
  MessageSquare,
  TrendingUp,
  Star,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Branch {
  id: string;
  name: string;
  location?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  manager_id?: string;
}

interface BranchQRCode {
  id: string;
  name?: string;
  qr_code_url: string;
  feedback_url: string;
  is_active: boolean;
  created_at: string;
}

interface BranchAnalytics {
  totalFeedback: number;
  pendingFeedback: number;
  averageRating: number;
  responsesThisMonth: number;
  responsesTrend: string;
  satisfactionTrend: string;
}

const BranchManagement = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchQRCodes, setBranchQRCodes] = useState<BranchQRCode[]>([]);
  const [branchAnalytics, setBranchAnalytics] = useState<BranchAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchBranchData(selectedBranch.id);
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setBranches(data || []);
      if (data && data.length > 0 && !selectedBranch) {
        setSelectedBranch(data[0]);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast({
        title: "Error",
        description: "Failed to load branches",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranchData = async (branchId: string) => {
    await Promise.all([
      fetchBranchQRCodes(branchId),
      fetchBranchAnalytics(branchId)
    ]);
  };

  const fetchBranchQRCodes = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBranchQRCodes(data || []);
    } catch (error) {
      console.error('Error fetching branch QR codes:', error);
      setBranchQRCodes([]);
    }
  };

  const fetchBranchAnalytics = async (branchId: string) => {
    try {
      const { data: feedback, error } = await supabase
        .from('feedback')
        .select('rating, status, created_at')
        .eq('branch_id', branchId);

      if (error) throw error;

      const now = new Date();
      const thisMonth = feedback?.filter(f => {
        const createdAt = new Date(f.created_at);
        return createdAt.getMonth() === now.getMonth() && 
               createdAt.getFullYear() === now.getFullYear();
      }) || [];

      const lastMonth = feedback?.filter(f => {
        const createdAt = new Date(f.created_at);
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
        return createdAt.getMonth() === lastMonthDate.getMonth() && 
               createdAt.getFullYear() === lastMonthDate.getFullYear();
      }) || [];

      const totalFeedback = feedback?.length || 0;
      const pendingFeedback = feedback?.filter(f => f.status === 'pending').length || 0;
      const averageRating = feedback?.length > 0 
        ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length 
        : 0;

      const responsesTrend = thisMonth.length > lastMonth.length ? 'up' : 
                           thisMonth.length < lastMonth.length ? 'down' : 'stable';

      const thisMonthAvgRating = thisMonth.length > 0 
        ? thisMonth.reduce((sum, f) => sum + f.rating, 0) / thisMonth.length 
        : 0;
      const lastMonthAvgRating = lastMonth.length > 0 
        ? lastMonth.reduce((sum, f) => sum + f.rating, 0) / lastMonth.length 
        : 0;

      const satisfactionTrend = thisMonthAvgRating > lastMonthAvgRating ? 'up' : 
                              thisMonthAvgRating < lastMonthAvgRating ? 'down' : 'stable';

      setBranchAnalytics({
        totalFeedback,
        pendingFeedback,
        averageRating: Math.round(averageRating * 10) / 10,
        responsesThisMonth: thisMonth.length,
        responsesTrend,
        satisfactionTrend
      });
    } catch (error) {
      console.error('Error fetching branch analytics:', error);
      setBranchAnalytics(null);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default:
        return <TrendingUp className="h-4 w-4 text-gray-400" />;
    }
  };

  const downloadQRCode = async (qrCodeUrl: string, name: string) => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${name || 'qr-code'}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download started",
        description: "QR code is being downloaded",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download QR code",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading branches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Building className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Branch Management</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Branch Selection Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Branches</CardTitle>
              <CardDescription>Select a branch to manage</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => setSelectedBranch(branch)}
                    className={`w-full p-3 text-left hover:bg-muted transition-colors border-l-4 ${
                      selectedBranch?.id === branch.id
                        ? 'border-primary bg-muted'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="font-medium">{branch.name}</div>
                    {branch.location && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {branch.location}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {branchQRCodes.length} QR Codes
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Branch Details */}
        <div className="lg:col-span-3">
          {selectedBranch ? (
            <div className="space-y-6">
              {/* Branch Header */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    {selectedBranch.name}
                  </CardTitle>
                  <CardDescription>
                    {selectedBranch.description || selectedBranch.location || 'Branch details and analytics'}
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Analytics Overview */}
              {branchAnalytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{branchAnalytics.totalFeedback}</div>
                      <p className="text-xs text-muted-foreground">All time responses</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">This Month</CardTitle>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {getTrendIcon(branchAnalytics.responsesTrend)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{branchAnalytics.responsesThisMonth}</div>
                      <p className="text-xs text-muted-foreground">New responses</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-muted-foreground" />
                        {getTrendIcon(branchAnalytics.satisfactionTrend)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{branchAnalytics.averageRating}/5</div>
                      <p className="text-xs text-muted-foreground">Customer satisfaction</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{branchAnalytics.pendingFeedback}</div>
                      <p className="text-xs text-muted-foreground">Awaiting response</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Branch QR Codes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    QR Codes for {selectedBranch.name}
                  </CardTitle>
                  <CardDescription>
                    QR codes available for this branch location
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {branchQRCodes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {branchQRCodes.map((qrCode) => (
                        <Card key={qrCode.id} className="p-4">
                          <div className="text-center space-y-3">
                            <img
                              src={qrCode.qr_code_url}
                              alt={`QR Code - ${qrCode.name || 'Feedback'}`}
                              className="w-32 h-32 mx-auto border rounded-lg"
                            />
                            <div>
                              <h4 className="font-medium">
                                {qrCode.name || 'Feedback QR Code'}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                Created {new Date(qrCode.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadQRCode(qrCode.qr_code_url, qrCode.name || 'qr-code')}
                                className="flex-1"
                              >
                                Download
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(qrCode.feedback_url, '_blank')}
                                className="flex-1"
                              >
                                Preview
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No QR Codes Found</h3>
                      <p className="text-muted-foreground mb-4">
                        No QR codes have been generated for this branch yet.
                      </p>
                      <Button onClick={() => window.location.href = '/dashboard?section=qr-codes'}>
                        Generate QR Code
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a Branch</h3>
                  <p className="text-muted-foreground">
                    Choose a branch from the sidebar to view its details and QR codes
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchManagement;