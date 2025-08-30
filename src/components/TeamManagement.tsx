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
import { Users, Plus, UserPlus, Settings, UserMinus, Trash2 } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description: string;
  created_at: string;
  manager_id: string;
  is_active: boolean;
  member_count?: number;
}

interface TeamMember {
  id: string;
  role: string;
  profiles: {
    display_name: string;
    email: string;
  };
}

interface Profile {
  id: string;
  display_name: string;
  email: string;
}

export const TeamManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);

  useEffect(() => {
    fetchTeams();
    fetchProfiles();
  }, [user]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers(selectedTeam);
    }
  }, [selectedTeam]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members(count)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeams(data?.map(team => ({
        ...team,
        member_count: team.team_members?.[0]?.count || 0
      })) || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .order('display_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          role,
          profiles:user_id (
            display_name,
            email
          )
        `)
        .eq('team_id', teamId);

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const createTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      // Get user's profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, branch_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      const { error } = await supabase
        .from('teams')
        .insert([{
          name: formData.get('name') as string,
          description: formData.get('description') as string,
          manager_id: profile.id,
          branch_id: profile.branch_id
        }]);

      if (error) throw error;

      toast({
        title: "Team created",
        description: "New team has been created successfully",
      });

      setIsCreateDialogOpen(false);
      fetchTeams();
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive",
      });
    }
  };

  const addTeamMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;
    
    try {
      // First, check if a profile exists with this email
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .eq('email', email)
        .maybeSingle();

      if (profileError) throw profileError;

      // Check if user is already a member of this team
      if (existingProfile) {
        const { data: existingMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', selectedTeam)
          .eq('user_id', existingProfile.id)
          .maybeSingle();

        if (existingMember) {
          toast({
            title: "Already a member",
            description: `${email} is already a member of this team.`,
            variant: "destructive",
          });
          return;
        }
      }

      // Check if there's already a pending invitation for this email
      const { data: existingInvitation } = await supabase
        .from('team_invitations')
        .select('id, status')
        .eq('team_id', selectedTeam)
        .eq('email', email)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvitation) {
        toast({
          title: "Invitation already sent",
          description: `An invitation has already been sent to ${email}.`,
          variant: "destructive",
        });
        return;
      }

      // Get current user's profile ID for the invitation
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .eq('user_id', user?.id)
        .single();

      if (!currentProfile) throw new Error('Current user profile not found');

      if (existingProfile) {
        // User exists, add them directly to the team
        const { error } = await supabase
          .from('team_members')
          .insert([{
            team_id: selectedTeam,
            user_id: existingProfile.id,
            role: role
          }]);

        if (error) throw error;

        toast({
          title: "Member added",
          description: `${email} has been added to the team directly.`,
        });
      } else {
        // User doesn't exist, create an invitation
        const { error } = await supabase
          .from('team_invitations')
          .insert([{
            team_id: selectedTeam,
            email: email,
            role: role,
            invited_by: currentProfile.id
          }]);

        if (error) throw error;

        toast({
          title: "Invitation sent",
          description: `An invitation has been sent to ${email}. They will be added to the team when they sign up.`,
        });
      }

      // Send invitation email in both cases
      const team = teams.find(t => t.id === selectedTeam);
      if (team) {
        try {
          await supabase.functions.invoke('send-team-invitation', {
            body: {
              email: email,
              teamName: team.name,
              taskTitle: existingProfile ? `Welcome to ${team.name}` : `Invitation to join ${team.name}`,
              taskDescription: existingProfile 
                ? `You have been added to the ${team.name} team.`
                : `You have been invited to join the ${team.name} team. Please sign up to accept this invitation.`,
              inviterName: currentProfile.display_name || currentProfile.email,
              signupRequired: !existingProfile
            }
          });
        } catch (emailError) {
          console.error('Error sending invitation email:', emailError);
          // Don't fail the invitation if email fails
        }
      }

      setIsAddMemberDialogOpen(false);
      fetchTeamMembers(selectedTeam);
      fetchTeams();
    } catch (error) {
      console.error('Error adding team member:', error);
      toast({
        title: "Error",
        description: "Failed to add team member or send invitation",
        variant: "destructive",
      });
    }
  };

  const removeTeamMember = async (memberId: string, memberEmail: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Member removed",
        description: `${memberEmail} has been removed from the team`,
      });

      fetchTeamMembers(selectedTeam);
      fetchTeams();
    } catch (error) {
      console.error('Error removing team member:', error);
      toast({
        title: "Error",
        description: "Failed to remove team member",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Management</h2>
          <p className="text-muted-foreground">Manage your teams and assign members</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a new team and start managing tasks
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createTeam} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input id="name" name="name" placeholder="Enter team name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  placeholder="Team description" 
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full">Create Team</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-semibold">Teams</h3>
          {teams.map((team) => (
            <Card 
              key={team.id} 
              className={`cursor-pointer transition-colors ${
                selectedTeam === team.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedTeam(team.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{team.name}</CardTitle>
                  <Badge variant="secondary">
                    {team.member_count} members
                  </Badge>
                </div>
                {team.description && (
                  <CardDescription className="text-sm">
                    {team.description}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Team Details */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Team Members
                    </CardTitle>
                    <CardDescription>
                      Manage team members and their roles
                    </CardDescription>
                  </div>
                  
                  <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Team Member</DialogTitle>
                        <DialogDescription>
                          Add a new member to this team
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={addTeamMember} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">User Email</Label>
                          <Input 
                            id="email" 
                            name="email" 
                            type="email"
                            placeholder="Enter user's email address" 
                            required 
                          />
                          <p className="text-sm text-muted-foreground">
                            Enter any email address. If the user doesn't have an account yet, they'll receive an invitation to sign up and join the team.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">Role</Label>
                          <Select name="role" defaultValue="member">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="lead">Team Lead</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="submit" className="w-full">Add Member / Send Invitation</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">
                          {member.profiles.display_name || member.profiles.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.profiles.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{member.role}</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeTeamMember(member.id, member.profiles.email)}
                          className="text-destructive hover:text-destructive"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {teamMembers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No team members yet. Add some members to get started.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a team to view its members</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};