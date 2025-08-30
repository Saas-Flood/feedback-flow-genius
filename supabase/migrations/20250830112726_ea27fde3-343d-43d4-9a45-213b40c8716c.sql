-- Fix RLS policies for team_invitations table to use proper profile ID mapping

-- Drop existing policies
DROP POLICY IF EXISTS "Team managers can view team invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team managers can create team invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team managers can update team invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team managers can delete team invitations" ON team_invitations;

-- Create corrected policies using get_user_profile_id helper function
CREATE POLICY "Team managers can view team invitations" 
ON team_invitations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM teams 
  WHERE teams.id = team_invitations.team_id 
  AND teams.manager_id = get_user_profile_id(auth.uid())
));

CREATE POLICY "Team managers can create team invitations" 
ON team_invitations 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM teams 
  WHERE teams.id = team_invitations.team_id 
  AND teams.manager_id = get_user_profile_id(auth.uid())
));

CREATE POLICY "Team managers can update team invitations" 
ON team_invitations 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM teams 
  WHERE teams.id = team_invitations.team_id 
  AND teams.manager_id = get_user_profile_id(auth.uid())
));

CREATE POLICY "Team managers can delete team invitations" 
ON team_invitations 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM teams 
  WHERE teams.id = team_invitations.team_id 
  AND teams.manager_id = get_user_profile_id(auth.uid())
));