import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Download, Copy } from 'lucide-react';

interface FeedbackCategory {
  id: string;
  name: string;
}

export const QRCodeGenerator = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [feedbackUrl, setFeedbackUrl] = useState<string>('');
  const [categories, setCategories] = useState<FeedbackCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');

  useEffect(() => {
    fetchCategories();
    fetchUserBranch();
  }, [user]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to load feedback categories",
        variant: "destructive",
      });
    }
  };

  const fetchUserBranch = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('branch_id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setBranchId(data?.branch_id || '');
    } catch (error) {
      console.error('Error fetching user branch:', error);
    }
  };

  const generateQRCode = async () => {
    if (!selectedCategory) {
      toast({
        title: "Category required",
        description: "Please select a feedback category",
        variant: "destructive",
      });
      return;
    }

    try {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/feedback?category=${selectedCategory}&branch=${branchId}`;
      setFeedbackUrl(url);
      
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeUrl(qrDataUrl);
      
      toast({
        title: "QR Code generated",
        description: "Your QR code is ready to use",
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'feedback-qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyFeedbackUrl = async () => {
    if (!feedbackUrl) return;

    try {
      await navigator.clipboard.writeText(feedbackUrl);
      toast({
        title: "URL copied",
        description: "Feedback URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy URL to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Feedback Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={generateQRCode} className="w-full">
            Generate QR Code
          </Button>

          {feedbackUrl && (
            <div className="space-y-2">
              <Label>Feedback URL</Label>
              <div className="flex gap-2">
                <Input value={feedbackUrl} readOnly className="flex-1" />
                <Button variant="outline" size="icon" onClick={copyFeedbackUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {qrCodeUrl && (
          <Card>
            <CardContent className="p-6 text-center">
              <img 
                src={qrCodeUrl} 
                alt="QR Code for feedback" 
                className="mx-auto mb-4"
              />
              <Button onClick={downloadQRCode} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download QR Code
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};