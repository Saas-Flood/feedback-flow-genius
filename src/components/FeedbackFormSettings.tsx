import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Upload, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface FeedbackFormSettings {
  id?: string;
  branch_id?: string;
  logo_url?: string;
  welcome_title: string;
  welcome_description: string;
  primary_color: string;
  background_color: string;
}

const FeedbackFormSettings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<FeedbackFormSettings>({
    welcome_title: 'Welcome! 🍽️',
    welcome_description: "We'd love to hear your feedback",
    primary_color: '#3b82f6',
    background_color: '#ffffff'
  });
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      fetchSettings(selectedBranchId);
    }
  }, [selectedBranchId]);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBranches(data || []);
      
      if (data && data.length > 0) {
        setSelectedBranchId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast({
        title: "Error",
        description: "Failed to load branches",
        variant: "destructive",
      });
    }
  };

  const fetchSettings = async (branchId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedback_form_settings')
        .select('*')
        .eq('branch_id', branchId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      } else {
        // Reset to defaults if no settings found
        setSettings({
          branch_id: branchId,
          welcome_title: 'Welcome! 🍽️',
          welcome_description: "We'd love to hear your feedback",
          primary_color: '#3b82f6',
          background_color: '#ffffff'
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsData = {
        ...settings,
        branch_id: selectedBranchId
      };

      const { error } = await supabase
        .from('feedback_form_settings')
        .upsert([settingsData], {
          onConflict: 'branch_id'
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Feedback form settings updated successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof FeedbackFormSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Feedback Form Settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customize Feedback Form</CardTitle>
          <CardDescription>
            Personalize your feedback form with custom branding and messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="branch-select">Select Branch</Label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isLoading && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="logo-url">Logo URL</Label>
                    <Input
                      id="logo-url"
                      value={settings.logo_url || ''}
                      onChange={(e) => handleInputChange('logo_url', e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter a URL to your logo image
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="welcome-title">Welcome Title</Label>
                    <Input
                      id="welcome-title"
                      value={settings.welcome_title}
                      onChange={(e) => handleInputChange('welcome_title', e.target.value)}
                      placeholder="Welcome! 🍽️"
                    />
                  </div>

                  <div>
                    <Label htmlFor="welcome-description">Welcome Description</Label>
                    <Textarea
                      id="welcome-description"
                      value={settings.welcome_description}
                      onChange={(e) => handleInputChange('welcome_description', e.target.value)}
                      placeholder="We'd love to hear your feedback"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={settings.primary_color}
                        onChange={(e) => handleInputChange('primary_color', e.target.value)}
                        className="w-20 h-10 p-1"
                      />
                      <Input
                        value={settings.primary_color}
                        onChange={(e) => handleInputChange('primary_color', e.target.value)}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="background-color">Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="background-color"
                        type="color"
                        value={settings.background_color}
                        onChange={(e) => handleInputChange('background_color', e.target.value)}
                        className="w-20 h-10 p-1"
                      />
                      <Input
                        value={settings.background_color}
                        onChange={(e) => handleInputChange('background_color', e.target.value)}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Preview</h3>
                    <p className="text-sm text-muted-foreground">
                      See how your form will look to customers
                    </p>
                  </div>
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>

                <div className="mt-4 p-4 border rounded-lg" style={{ backgroundColor: settings.background_color }}>
                  <div className="text-center space-y-2">
                    {settings.logo_url && (
                      <img
                        src={settings.logo_url}
                        alt="Logo"
                        className="mx-auto h-12 w-auto object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <h3 className="text-lg font-semibold" style={{ color: settings.primary_color }}>
                      {settings.welcome_title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {settings.welcome_description}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackFormSettings;