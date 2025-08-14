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

interface SavedQRCode {
  id: string;
  name: string;
  feedback_url: string;
  qr_code_url: string;
  created_at: string;
}

export const QRCodeGenerator = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [feedbackUrl, setFeedbackUrl] = useState<string>('');
  const [qrName, setQrName] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [savedQRCodes, setSavedQRCodes] = useState<SavedQRCode[]>([]);

  useEffect(() => {
    fetchUserBranch();
    fetchSavedQRCodes();
  }, [user]);

  const fetchSavedQRCodes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedQRCodes(data || []);
    } catch (error) {
      console.error('Error fetching saved QR codes:', error);
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
    if (!qrName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your QR code",
        variant: "destructive",
      });
      return;
    }

    try {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/feedback?branch=${branchId}`;
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

  const saveQRCode = async () => {
    if (!qrCodeUrl || !user || !qrName.trim()) {
      toast({
        title: "Error",
        description: "Please generate a QR code and enter a name first",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('qr_codes')
        .insert([{
          user_id: user.id,
          name: qrName.trim(),
          feedback_url: feedbackUrl,
          qr_code_url: qrCodeUrl,
          branch_id: branchId,
          category_id: null
        }]);

      if (error) throw error;

      toast({
        title: "QR Code saved",
        description: "Your QR code has been saved successfully",
      });

      // Reset form and refresh saved QR codes
      setQrName('');
      setQrCodeUrl('');
      setFeedbackUrl('');
      fetchSavedQRCodes();
    } catch (error) {
      console.error('Error saving QR code:', error);
      toast({
        title: "Error",
        description: "Failed to save QR code",
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

  const copyFeedbackUrl = async (url?: string) => {
    const urlToCopy = url || feedbackUrl;
    if (!urlToCopy) return;

    try {
      await navigator.clipboard.writeText(urlToCopy);
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>QR Code Name</Label>
            <Input
              value={qrName}
              onChange={(e) => setQrName(e.target.value)}
              placeholder="e.g., Main Branch QR"
            />
          </div>

          <Button onClick={generateQRCode} className="w-full">
            Generate QR Code
          </Button>

          {qrCodeUrl && (
            <>
              <div className="space-y-2">
                <Label>Feedback URL</Label>
                <div className="flex gap-2">
                  <Input value={feedbackUrl} readOnly className="flex-1" />
                  <Button variant="outline" size="icon" onClick={() => copyFeedbackUrl()}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={downloadQRCode} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button onClick={saveQRCode} className="flex-1">
                  Save QR Code
                </Button>
              </div>
            </>
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
              <p className="text-sm text-muted-foreground">
                Customers can scan this QR code to submit feedback
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {savedQRCodes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Saved QR Codes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedQRCodes.map((qr) => (
              <Card key={qr.id}>
                <CardContent className="p-4">
                  <div className="text-center space-y-2">
                    <img 
                      src={qr.qr_code_url} 
                      alt={`QR Code for ${qr.name}`} 
                      className="mx-auto w-24 h-24"
                    />
                    <h4 className="font-medium">{qr.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(qr.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = qr.qr_code_url;
                          link.download = `${qr.name}-qr-code.png`;
                          link.click();
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => copyFeedbackUrl(qr.feedback_url)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};