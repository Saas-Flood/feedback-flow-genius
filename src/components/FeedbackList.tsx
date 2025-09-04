import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, Star, Clock, CheckCircle, 
  MoreHorizontal, Eye, Phone, Mail, User, Calendar
} from 'lucide-react';

interface Feedback {
  id: string;
  subject: string;
  message: string;
  rating: number;
  status: string;
  priority: string;
  created_at: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  is_anonymous: boolean;
}

interface FeedbackListProps {
  onFeedbackUpdate?: () => void;
}

export const FeedbackList = ({ onFeedbackUpdate }: FeedbackListProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchFeedback();
  }, [user]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setFeedback(data || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast({
        title: "Error",
        description: "Failed to fetch feedback",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (feedbackId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ 
          status: newStatus,
          resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null
        })
        .eq('id', feedbackId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Feedback marked as ${newStatus}`,
      });

      fetchFeedback();
      if (onFeedbackUpdate) {
        onFeedbackUpdate();
      }
    } catch (error) {
      console.error('Error updating feedback status:', error);
      toast({
        title: "Error",
        description: "Failed to update feedback status",
        variant: "destructive",
      });
    }
  };


  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-orange-100 text-orange-800',
      low: 'bg-green-100 text-green-800'
    };

    return (
      <Badge variant="outline" className={variants[priority as keyof typeof variants] || variants.medium}>
        {priority}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedback.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No feedback available</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {feedback.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base font-medium">{item.subject}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(item.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => {
                          setSelectedFeedback(item);
                          setIsViewDialogOpen(true);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {item.status === 'pending' && (
                          <>
                            <DropdownMenuItem onClick={() => updateFeedbackStatus(item.id, 'in_progress')}>
                              <Clock className="h-4 w-4 mr-2" />
                              Mark In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFeedbackStatus(item.id, 'resolved')}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Resolved
                            </DropdownMenuItem>
                          </>
                        )}
                        {item.status === 'in_progress' && (
                          <DropdownMenuItem onClick={() => updateFeedbackStatus(item.id, 'resolved')}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Resolved
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {getRatingStars(item.rating)}
                    <span className="text-sm text-muted-foreground ml-2">
                      {item.rating}/5
                    </span>
                  </div>
                  {getPriorityBadge(item.priority)}
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.message}
                </p>
                
                {!item.is_anonymous && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {item.customer_name && (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{item.customer_name}</span>
                      </div>
                    )}
                    {item.customer_email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        <span>{item.customer_email}</span>
                      </div>
                    )}
                    {item.customer_phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        <span>{item.customer_phone}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Feedback Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Subject</Label>
                <p className="text-sm mt-1">{selectedFeedback.subject}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Message</Label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                  {selectedFeedback.message}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Rating</Label>
                  <div className="flex items-center gap-1 mt-1">
                    {getRatingStars(selectedFeedback.rating)}
                    <span className="text-sm ml-1">{selectedFeedback.rating}/5</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <div className="mt-1">
                    {getPriorityBadge(selectedFeedback.priority)}
                  </div>
                </div>
              </div>
              
              {!selectedFeedback.is_anonymous && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Customer Information</Label>
                  {selectedFeedback.customer_name && (
                    <p className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedFeedback.customer_name}
                    </p>
                  )}
                  {selectedFeedback.customer_email && (
                    <p className="text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {selectedFeedback.customer_email}
                    </p>
                  )}
                  {selectedFeedback.customer_phone && (
                    <p className="text-sm flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {selectedFeedback.customer_phone}
                    </p>
                  )}
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium">Submitted</Label>
                <p className="text-sm mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(selectedFeedback.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};