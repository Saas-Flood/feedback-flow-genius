import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  User, 
  Bell, 
  Shield, 
  Crown,
  Calendar,
  Settings as SettingsIcon,
  ExternalLink
} from 'lucide-react';

interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  role: string;
  branch_id: string | null;
}

export const Settings = () => {
  const { user } = useAuth();
  const { 
    subscribed, 
    subscriptionTier, 
    subscriptionEnd, 
    trialEnd, 
    loading,
    openCustomerPortal,
    createCheckout
  } = useSubscription();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    feedbackAlerts: true,
    weeklyDigest: false,
    systemUpdates: true
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setDisplayName(data.display_name || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile settings",
        variant: "destructive"
      });
    }
  };

  const updateProfile = async () => {
    if (!user || !profile) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
      
      await fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getSubscriptionStatus = () => {
    if (subscriptionTier === 'trial') {
      return {
        status: 'Free Trial',
        color: 'bg-blue-500',
        description: `Trial ends ${formatDate(trialEnd)}`,
        features: ['Unlimited feedback', 'Multi-language support', '1 branch only']
      };
    }
    if (subscriptionTier === 'basic') {
      return {
        status: 'Basic Plan',
        color: 'bg-green-500',
        description: `Renews ${formatDate(subscriptionEnd)}`,
        features: ['200 feedback/month', 'Unlimited branches', 'No translation']
      };
    }
    if (subscriptionTier === 'pro') {
      return {
        status: 'Pro Plan',
        color: 'bg-purple-500',
        description: `Renews ${formatDate(subscriptionEnd)}`,
        features: ['Unlimited feedback', 'Multi-language support', 'Unlimited branches']
      };
    }
    return {
      status: 'No Active Plan',
      color: 'bg-gray-500',
      description: 'Upgrade to access premium features',
      features: []
    };
  };

  const subscriptionInfo = getSubscriptionStatus();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and subscription
        </p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account">
            <User className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CreditCard className="w-4 h-4 mr-2" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={user?.email || ''} 
                    disabled 
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed here
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter display name"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input value={profile?.role || 'user'} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Account Created</Label>
                  <Input 
                    value={user?.created_at ? formatDate(user.created_at) : 'N/A'} 
                    disabled 
                    className="bg-muted" 
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={updateProfile}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update Profile'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={`${subscriptionInfo.color} text-white`}>
                      {subscriptionInfo.status}
                    </Badge>
                    {subscriptionTier === 'trial' && (
                      <Badge variant="outline">
                        <Calendar className="w-3 h-3 mr-1" />
                        Trial
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {subscriptionInfo.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {subscriptionInfo.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {subscribed && subscriptionTier !== 'trial' && (
                    <Button 
                      variant="outline"
                      onClick={openCustomerPortal}
                      disabled={loading}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Manage Billing
                    </Button>
                  )}
                  
                  {(!subscribed || subscriptionTier === 'trial') && (
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => createCheckout('basic')}
                        disabled={loading}
                        variant="outline"
                      >
                        Upgrade to Basic ($20)
                      </Button>
                      <Button 
                        onClick={() => createCheckout('pro')}
                        disabled={loading}
                      >
                        Upgrade to Pro ($40)
                      </Button>
                    </div>
                  )}
                  
                  {subscriptionTier === 'basic' && (
                    <Button 
                      onClick={() => createCheckout('pro')}
                      disabled={loading}
                    >
                      Upgrade to Pro ($40)
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Plan Comparison</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className={subscriptionTier === 'trial' ? 'border-blue-500' : ''}>
                    <CardContent className="p-4">
                      <h5 className="font-medium">Free Trial</h5>
                      <p className="text-sm text-muted-foreground">14 days</p>
                      <ul className="text-xs space-y-1 mt-2">
                        <li>✓ Unlimited feedback</li>
                        <li>✓ Multi-language</li>
                        <li>⚠️ 1 branch only</li>
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card className={subscriptionTier === 'basic' ? 'border-green-500' : ''}>
                    <CardContent className="p-4">
                      <h5 className="font-medium">Basic Plan</h5>
                      <p className="text-sm text-muted-foreground">$20/month</p>
                      <ul className="text-xs space-y-1 mt-2">
                        <li>✓ 200 feedback/month</li>
                        <li>✓ Unlimited branches</li>
                        <li>✗ No translation</li>
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card className={subscriptionTier === 'pro' ? 'border-purple-500' : ''}>
                    <CardContent className="p-4">
                      <h5 className="font-medium">Pro Plan</h5>
                      <p className="text-sm text-muted-foreground">$40/month</p>
                      <ul className="text-xs space-y-1 mt-2">
                        <li>✓ Unlimited feedback</li>
                        <li>✓ Multi-language</li>
                        <li>✓ Unlimited branches</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates about your account
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Feedback Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when new feedback is received
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.feedbackAlerts}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, feedbackAlerts: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Digest</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive weekly summary of your feedback
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.weeklyDigest}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, weeklyDigest: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>System Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Important updates about the platform
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.systemUpdates}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, systemUpdates: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and privacy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Password</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Change your account password
                  </p>
                  <Button variant="outline" size="sm">
                    Change Password
                  </Button>
                </div>
                
                <Separator />
                
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add an extra layer of security to your account
                  </p>
                  <Button variant="outline" size="sm">
                    Enable 2FA
                  </Button>
                </div>
                
                <Separator />
                
                <div>
                  <Label>Account Deletion</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Permanently delete your account and all data
                  </p>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};