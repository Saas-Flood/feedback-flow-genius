import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Star, CheckCircle, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguageDetection } from '@/hooks/useLanguageDetection';
import GoogleTranslate from '@/components/GoogleTranslate';

interface FeedbackCategory {
  id: string;
  name: string;
  description?: string;
}

interface FeedbackFormSettings {
  id?: string;
  branch_id?: string;
  logo_url?: string;
  welcome_title: string;
  welcome_description: string;
  primary_color: string;
  background_color: string;
  google_place_id?: string;
}

const Feedback = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const language = useLanguageDetection();
  const [branchId, setBranchId] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formSettings, setFormSettings] = useState<FeedbackFormSettings>({
    welcome_title: 'Welcome! 🍽️',
    welcome_description: "We'd love to hear your feedback",
    primary_color: '#3b82f6',
    background_color: '#ffffff'
  });

  useEffect(() => {
    const branch = searchParams.get('branch');
    if (branch) {
      setBranchId(branch);
      fetchFormSettings(branch);
    }
  }, [searchParams]);

  const fetchFormSettings = async (branchId: string) => {
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
        setFormSettings(data);
      }
    } catch (error) {
      console.error('Error fetching form settings:', error);
      // Keep default settings if fetch fails
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before submitting",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData(e.currentTarget);
      const feedbackData = {
        subject: formData.get('subject') as string || 'General Feedback',
        message: formData.get('message') as string,
        rating,
        category_id: null,
        branch_id: branchId || null,
        customer_name: formData.get('name') as string || null,
        customer_email: formData.get('email') as string || null,
        customer_phone: formData.get('phone') as string || null,
        status: 'pending',
        priority: 'medium',
        is_anonymous: !(formData.get('name') as string)
      };

      const { error } = await supabase
        .from('feedback')
        .insert([feedbackData]);

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback! We'll review it soon.",
      });

      // Redirect to Google Review for positive feedback (4-5 stars)
      if (rating >= 4 && formSettings.google_place_id) {
        setTimeout(() => {
          const googleReviewUrl = `https://search.google.com/local/writereview?placeid=${formSettings.google_place_id}`;
          window.open(googleReviewUrl, '_blank');
        }, 1500);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: formSettings.background_color }}>
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Thank You!</CardTitle>
            <CardDescription>
              Your feedback has been submitted successfully. We appreciate your input and will review it shortly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              Submit Another Feedback
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: formSettings.background_color }}>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center space-y-4">
            {formSettings.logo_url && (
              <div className="flex justify-center">
                <img
                  src={formSettings.logo_url}
                  alt="Logo"
                  className="h-16 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            <CardTitle style={{ color: formSettings.primary_color }}>
              {formSettings.welcome_title}
            </CardTitle>
            <CardDescription>
              {formSettings.welcome_description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {language.detected && (
              <div className="text-center">
                <Badge variant="secondary" className="mb-2 flex items-center gap-1 w-fit mx-auto">
                  <Globe className="h-3 w-3" />
                  Language detected: {language.name}
                </Badge>
                <p className="text-muted-foreground">Feel free to write your feedback in {language.name} or any language you prefer</p>
              </div>
            )}
            
            <GoogleTranslate targetLanguage={language.code} />
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Rate your experience</label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="p-1"
                    >
                      <Star
                        className={`h-8 w-8 cursor-pointer hover:scale-110 transition-transform ${
                          star <= (hoveredRating || rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Tell us more (optional)</label>
                <Textarea 
                  name="message"
                  className="w-full mt-2 p-3 border rounded-lg resize-none" 
                  rows={4} 
                  placeholder={`Share your thoughts in ${language.name || 'your preferred language'}...`}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                disabled={isSubmitting}
                style={{ backgroundColor: formSettings.primary_color }}
              >
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Feedback;
