import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckSquare, Plus, Calendar, User, Flag } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
  assigned_to: string;
  team_id: string;
  teams: {
    name: string;
  } | null;
  profiles: {
    display_name: string;
    email: string;
  } | null;
}

interface Team {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  display_name: string;
  email: string;
}

export const TaskManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchTasks();
    fetchTeams();
    fetchProfiles();
  }, [user]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          due_date,
          created_at,
          assigned_to,
          team_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch related data separately
      const tasksWithRelations = await Promise.all((data || []).map(async (task) => {
        // Get team name
        let teamName = 'No team';
        if (task.team_id) {
          const { data: teamData } = await supabase
            .from('teams')
            .select('name')
            .eq('id', task.team_id)
            .single();
          teamName = teamData?.name || 'No team';
        }

        // Get assigned user profile
        let profileData = null;
        if (task.assigned_to) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, email')
            .eq('id', task.assigned_to)
            .single();
          profileData = profile;
        }

        return {
          ...task,
          teams: task.team_id ? { name: teamName } : null,
          profiles: profileData
        };
      }));
      
      setTasks(tasksWithRelations);
    } catch (error) {
      console.error('Error fetching tasks:', error);
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

  const createTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      // Get user's profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      const { error } = await supabase
        .from('tasks')
        .insert([{
          title: formData.get('title') as string,
          description: formData.get('description') as string,
          status: 'pending',
          priority: formData.get('priority') as string,
          assigned_to: formData.get('assigned_to') as string,
          assigned_by: profile.id,
          team_id: formData.get('team_id') as string,
          due_date: formData.get('due_date') as string || null
        }]);

      if (error) throw error;

      toast({
        title: "Task created",
        description: "New task has been created successfully",
      });

      setIsCreateDialogOpen(false);
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Task updated",
        description: "Task status has been updated",
      });

      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTasks = statusFilter === 'all' 
    ? tasks 
    : tasks.filter(task => task.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Task Management</h2>
          <p className="text-muted-foreground">Assign and track team tasks</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Assign a new task to team members
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createTask} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input id="title" name="title" placeholder="Enter task title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  placeholder="Task description" 
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team_id">Team</Label>
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
                <Label htmlFor="assigned_to">Assign To</Label>
                <Select name="assigned_to" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
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
                <Label htmlFor="priority">Priority</Label>
                <Select name="priority" defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input id="due_date" name="due_date" type="datetime-local" />
              </div>
              <Button type="submit" className="w-full">Create Task</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Controls */}
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map((task) => (
          <Card key={task.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{task.title}</CardTitle>
                <Badge className={getStatusColor(task.status)}>
                  {task.status.replace('_', ' ')}
                </Badge>
              </div>
              {task.description && (
                <CardDescription className="text-sm">
                  {task.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{task.profiles?.display_name || task.profiles?.email || 'Unassigned'}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckSquare className="h-4 w-4" />
                <span>{task.teams?.name || 'No team'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4" />
                <Badge variant="outline" className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </div>
              
              {task.due_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(task.due_date).toLocaleDateString()}</span>
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                {task.status === 'pending' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => updateTaskStatus(task.id, 'in_progress')}
                  >
                    Start
                  </Button>
                )}
                {task.status === 'in_progress' && (
                  <Button 
                    size="sm"
                    onClick={() => updateTaskStatus(task.id, 'completed')}
                  >
                    Complete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No tasks found. Create your first task to get started.</p>
        </div>
      )}
    </div>
  );
};