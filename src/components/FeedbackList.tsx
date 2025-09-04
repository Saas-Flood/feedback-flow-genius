import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import emailjs from '@emailjs/browser';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Star, MessageCircle, Clock, CheckCircle, UserPlus, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Feedback {
  id: string;
  subject: string;
  message: string;
  rating: number;
  status: string;
  priority: string;
  customer_name?: string;
  customer_email?: string;
  created_at: string;
  category_id: string;
}

interface FeedbackListProps {
  onFeedbackUpdate: () => void;
}

export const FeedbackList: React.FC<FeedbackListProps> = ({ onFeedbackUpdate }) => {
  const { user } = useAuth();
  const { subscriptionTier } = useSubscription();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    fetchFeedback();
    fetchTeams();
    fetchProfiles();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('feedback-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'feedback' },
        () => {
          fetchFeedback();
          onFeedbackUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, onFeedbackUpdate]);

  const fetchFeedback = async () => {
    if (!user) return;

    try {
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
        description: "Failed to load feedback",
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
    } catch (error) {
      console.error('Error updating feedback status:', error);
      toast({
        title: "Error",
        description: "Failed to update feedback status",
        variant: "destructive",
      });
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('is_active', true);

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const createTaskFromFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!selectedFeedback) return;

    try {
      // Get user's profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      // Create the task
      const { error: taskError } = await supabase
        .from('tasks')
        .insert([{
          title: `Feedback: ${selectedFeedback.subject}`,
          description: `${selectedFeedback.message}\n\nOriginal feedback rating: ${selectedFeedback.rating}/5 stars\nCustomer: ${selectedFeedback.customer_name || 'Anonymous'}`,
          status: 'pending',
          priority: selectedFeedback.priority,
          assigned_to: formData.get('assigned_to') as string,
          assigned_by: profile.id,
          team_id: formData.get('team_id') as string,
          due_date: formData.get('due_date') as string || null
        }]);

      if (taskError) throw taskError;

      // Send invitation email using EmailJS (no domain verification needed)
      const assigneeId = formData.get('assigned_to') as string;
      const teamId = formData.get('team_id') as string;
      const assignee = profiles.find(p => p.id === assigneeId);
      const team = teams.find(t => t.id === teamId);

      if (assignee && team) {
        try {
          // Initialize EmailJS with your public key
          emailjs.init("YOUR_PUBLIC_KEY"); // You'll need to replace this

          const templateParams = {
            to_email: assignee.email,
            to_name: assignee.display_name || assignee.email,
            from_name: profile.display_name || profile.email,
            team_name: team.name,
            task_title: `Feedback: ${selectedFeedback.subject}`,
            task_description: selectedFeedback.message,
            task_rating: selectedFeedback.rating,
            customer_name: selectedFeedback.customer_name || 'Anonymous',
            due_date: formData.get('due_date') as string || 'Not specified',
            app_name: 'Smart Feedback'
          };

          await emailjs.send(
            'YOUR_SERVICE_ID', // You'll need to replace this
            'YOUR_TEMPLATE_ID', // You'll need to replace this
            templateParams
          );

          toast({
            title: "Task assigned",
            description: "Task created and team member notified via email",
          });
        } catch (emailError) {
          console.error('Error sending invitation email:', emailError);
          toast({
            title: "Task assigned",
            description: "Task created but email notification failed. Please notify the team member manually.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Task assigned",
          description: "Task created successfully",
        });
      }

      setIsAssignTaskOpen(false);
      setSelectedFeedback(null);
    } catch (error) {
      console.error('Error creating task from feedback:', error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const exportFeedbackData = async () => {
    if (subscriptionTier !== 'pro') {
      toast({
        title: "Pro Plan Required",
        description: "Data export is only available for Pro plan subscribers.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch all feedback for export
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const csvHeaders = [
        'ID',
        'Subject',
        'Message',
        'Rating',
        'Status',
        'Priority',
        'Customer Name',
        'Customer Email',
        'Customer Phone',
        'Created At',
        'Resolved At'
      ];

      const csvData = data.map(item => [
        item.id,
        `"${item.subject.replace(/"/g, '""')}"`,
        `"${item.message.replace(/"/g, '""')}"`,
        item.rating,
        item.status,
        item.priority,
        item.customer_name || '',
        item.customer_email || '',
        item.customer_phone || '',
        new Date(item.created_at).toLocaleString(),
        item.resolved_at ? new Date(item.resolved_at).toLocaleString() : ''
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `feedback_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Complete",
        description: "Feedback data has been exported successfully.",
      });
    } catch (error) {
      console.error('Error exporting feedback:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export feedback data.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'in_progress': return 'bg-blue-500';
      case 'resolved': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading feedback...</div>;
  }

  if (feedback.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">No feedback yet</h3>
        <p className="text-muted-foreground">
          Generate a QR code and start collecting customer feedback!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={exportFeedbackData}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>
      {feedback.map((item) => (
        <Card key={item.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>
                    {item.customer_name ? item.customer_name.charAt(0).toUpperCase() : 'A'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{item.subject}</CardTitle>
                  <CardDescription>
                    {item.customer_name && (
                      <span>{item.customer_name} • </span>
                    )}
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < item.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <Badge variant="outline" className={getPriorityColor(item.priority)}>
                  {item.priority}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{item.message}</p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`} />
                <span className="text-sm capitalize">{item.status.replace('_', ' ')}</span>
              </div>
              
              <div className="flex gap-2">
                {item.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateFeedbackStatus(item.id, 'in_progress')}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Start Review
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedFeedback(item);
                        setIsAssignTaskOpen(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Assign Task
                    </Button>
                  </>
                )}
                {item.status === 'in_progress' && (
                  <Button
                    size="sm"
                    onClick={() => updateFeedbackStatus(item.id, 'resolved')}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Mark Resolved
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Assign Task Dialog */}
      <Dialog open={isAssignTaskOpen} onOpenChange={setIsAssignTaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Task from Feedback</DialogTitle>
            <DialogDescription>
              Create a task and invite team members via email
            </DialogDescription>
          </DialogHeader>
          {selectedFeedback && (
            <form onSubmit={createTaskFromFeedback} className="space-y-4">
              <div className="space-y-2">
                <Label>Feedback Subject</Label>
                <Input value={selectedFeedback.subject} disabled />
              </div>
              <div className="space-y-2">
                <Label>Customer Rating</Label>
                <div className="flex items-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < selectedFeedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="text-sm text-muted-foreground">
                    ({selectedFeedback.rating}/5)
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team_id">Assign to Team</Label>
                <Select name="team_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Assign to Member</Label>
                <Select name="assigned_to" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.display_name || profile.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date (Optional)</Label>
                <Input id="due_date" name="due_date" type="datetime-local" />
              </div>
              <Button type="submit" className="w-full">
                Create Task & Send Invitation
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};