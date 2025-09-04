import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingUp, 
  Brain, 
  MessageSquare, 
  BarChart3, 
  Lightbulb, 
  Target,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface AnalysisInsights {
  sentiment?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  trends?: string[];
  recommendations?: string[];
  summary?: string;
  keyTopics?: string[];
  priorityActions?: string[];
  impactAreas?: string[];
  ratingDistribution?: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  stats?: {
    totalFeedback: number;
    averageRating: number;
    ratingDistribution: Record<string, number>;
    pendingCount: number;
    resolvedCount: number;
  };
}

export const IntelligentAnalytics = () => {
  const { user } = useAuth();
  const { subscribed, subscriptionTier } = useSubscription();
  const { toast } = useToast();
  const [insights, setInsights] = useState<AnalysisInsights>({});
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');
  const [analysisType, setAnalysisType] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLimit, setUsageLimit] = useState(0);

  // Set usage limits based on subscription tier
  useEffect(() => {
    if (!subscribed) {
      setUsageLimit(0);
    } else if (subscriptionTier === 'Basic') {
      setUsageLimit(10); // 3 AI analyses per month for Basic
    } else if (subscriptionTier === 'Premium' || subscriptionTier === 'Enterprise') {
      setUsageLimit(-1); // Unlimited for Pro/Enterprise
    } else {
      setUsageLimit(0);
    }
  }, [subscribed, subscriptionTier]);

  // Get current usage count
  useEffect(() => {
    const getUsageCount = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('analytics_events')
          .select('*')
          .eq('user_id', user.id)
          .eq('event_type', 'ai_analysis')
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
        
        if (!error) {
          setUsageCount(data?.length || 0);
        }
      } catch (error) {
        console.error('Error fetching usage count:', error);
      }
    };
    
    getUsageCount();
  }, [user]);

  const canUseAI = () => {
    if (!subscribed) return false;
    if (usageLimit === -1) return true; // Unlimited
    return usageCount < usageLimit;
  };

  const analyzeData = async (type: string = analysisType) => {
    if (!user) return;

    // Check if user can use AI features
    if (!canUseAI()) {
      toast({
        title: "Usage Limit Reached",
        description: subscriptionTier === 'Basic' 
          ? `You've reached your monthly limit of ${usageLimit} AI analyses. Upgrade to Pro for unlimited access.`
          : "Upgrade to access AI analytics features.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('analyze-feedback', {
        body: { type, timeRange }
      });

      if (error) throw error;

      if (data.success) {
        setInsights(data.insights);
        setLastUpdated(new Date());
        
        // Track usage for Basic plan users
        if (subscriptionTier === 'Basic') {
          await supabase
            .from('analytics_events')
            .insert({
              user_id: user.id,
              event_type: 'ai_analysis',
              event_data: { type, timeRange }
            });
          setUsageCount(prev => prev + 1);
        }
        
        toast({
          title: "Analysis Complete",
          description: "AI insights have been generated successfully",
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Error analyzing feedback:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to generate AI insights",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    analyzeData();
  }, [timeRange]);

  const getSentimentColor = (type: string) => {
    switch (type) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const renderSentimentAnalysis = () => (
    <div className="space-y-4">
      {insights.sentiment && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${getSentimentColor('positive')}`}>
                {insights.sentiment.positive}%
              </div>
              <p className="text-sm text-muted-foreground">Positive</p>
              <Progress value={insights.sentiment.positive} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${getSentimentColor('neutral')}`}>
                {insights.sentiment.neutral}%
              </div>
              <p className="text-sm text-muted-foreground">Neutral</p>
              <Progress value={insights.sentiment.neutral} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${getSentimentColor('negative')}`}>
                {insights.sentiment.negative}%
              </div>
              <p className="text-sm text-muted-foreground">Negative</p>
              <Progress value={insights.sentiment.negative} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}
      
      {insights.keyTopics && insights.keyTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Key Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {insights.keyTopics.map((topic, index) => (
                <Badge key={index} variant="secondary">
                  {topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderTrends = () => (
    <div className="space-y-4">
      {insights.trends && insights.trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Key Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.trends.map((trend, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  <BarChart3 className="h-5 w-5 mt-0.5 text-primary" />
                  <p className="text-sm">{trend}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {insights.stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(insights.stats.ratingDistribution).map(([rating, count]) => (
            <Card key={rating}>
              <CardContent className="p-4 text-center">
                <div className="text-xl font-bold">{count}</div>
                <p className="text-sm text-muted-foreground">{rating} Star{count !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderRecommendations = () => (
    <div className="space-y-4">
      {insights.priorityActions && insights.priorityActions.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              Priority Actions
            </CardTitle>
            <CardDescription className="text-orange-700">
              Most important actions to take immediately
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.priorityActions.map((action, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <p className="text-sm text-orange-900">{action}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {insights.recommendations && insights.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  <CheckCircle className="h-5 w-5 mt-0.5 text-green-500" />
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {insights.impactAreas && insights.impactAreas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Impact Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {insights.impactAreas.map((area, index) => (
                <Badge key={index} variant="outline">
                  {area}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Not subscribed at all
  if (!subscribed) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Intelligent Analytics
              <Badge variant="secondary" className="ml-2">Pro Feature</Badge>
            </h2>
            <p className="text-muted-foreground">AI-powered insights from your customer feedback</p>
          </div>
        </div>

        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="h-16 w-16 text-primary/40 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Unlock AI-Powered Insights</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Get detailed sentiment analysis, trend detection, and actionable recommendations 
              from your customer feedback with our paid plans.
            </p>
            <Button onClick={() => window.location.href = '/dashboard?pricing=true'}>
              View Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Basic plan with usage limits
  if (subscriptionTier === 'Basic') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Intelligent Analytics
              <Badge variant="outline" className="ml-2">Basic Plan</Badge>
            </h2>
            <p className="text-muted-foreground">AI-powered insights from your customer feedback</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Monthly AI Analyses</div>
            <div className="text-lg font-semibold">
              {usageCount} / {usageLimit}
            </div>
            <Progress value={(usageCount / usageLimit) * 100} className="w-24 mt-1" />
          </div>
        </div>

        {usageCount >= usageLimit && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">Usage Limit Reached</p>
                  <p className="text-sm text-orange-700">You've used all {usageLimit} AI analyses this month</p>
                </div>
              </div>
              <Button onClick={() => window.location.href = '/dashboard?pricing=true'}>
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => analyzeData()} 
              disabled={loading || !canUseAI()}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Analyzing...' : !canUseAI() ? 'Limit Reached' : 'Analyze with AI'}
            </Button>
          </div>
        </div>

        {/* Rest of the analytics content */}
        {renderAnalyticsContent()}
      </div>
    );
  }

  // Pro/Premium plan with full access
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Intelligent Analytics
            <Badge variant="default" className="ml-2 bg-gradient-to-r from-blue-600 to-purple-600">
              {subscriptionTier} Plan
            </Badge>
          </h2>
          <p className="text-muted-foreground">AI-powered insights from your customer feedback</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => analyzeData()} 
            disabled={loading}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Refresh Analysis'}
          </Button>
        </div>
      </div>

      {/* Rest of the analytics content */}
      {renderAnalyticsContent()}
    </div>
  );

  function renderAnalyticsContent() {
    return (
      <>
        {/* Status Bar */}
        {lastUpdated && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last updated: {lastUpdated.toLocaleString()}
            </div>
            {insights.stats && (
              <div className="flex items-center gap-4">
                <span>{insights.stats.totalFeedback} responses analyzed</span>
                <span>Avg rating: {insights.stats.averageRating.toFixed(1)}/5</span>
              </div>
            )}
          </div>
        )}

        {/* Summary Card */}
        {insights.summary && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                AI Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{insights.summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Analysis Tabs */}
        <Tabs value={analysisType} onValueChange={setAnalysisType}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sentiment" onClick={() => analyzeData('sentiment')}>
              Sentiment Analysis
            </TabsTrigger>
            <TabsTrigger value="trends" onClick={() => analyzeData('trends')}>
              Trends & Patterns
            </TabsTrigger>
            <TabsTrigger value="recommendations" onClick={() => analyzeData('recommendations')}>
              Recommendations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sentiment" className="space-y-4">
            {renderSentimentAnalysis()}
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            {renderTrends()}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            {renderRecommendations()}
          </TabsContent>
        </Tabs>

        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-lg font-medium">Analyzing feedback with AI...</p>
                <p className="text-sm text-muted-foreground">This may take a few moments</p>
              </div>
            </CardContent>
          </Card>
        )}
      </>
    );
  }
};