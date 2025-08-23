-- Create security definer functions to avoid infinite recursion in RLS policies

-- Function to get user's profile ID
CREATE OR REPLACE FUNCTION public.get_user_profile_id(user_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN (SELECT id FROM public.profiles WHERE user_id = user_uuid);
END;
$function$;

-- Function to check if user is team manager
CREATE OR REPLACE FUNCTION public.is_team_manager(user_uuid uuid, team_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
    user_profile_id uuid;
BEGIN
    -- Get user's profile ID
    SELECT id INTO user_profile_id FROM public.profiles WHERE user_id = user_uuid;
    
    -- Check if user is the manager of the team
    RETURN EXISTS (
        SELECT 1 FROM public.teams 
        WHERE id = team_uuid AND manager_id = user_profile_id
    );
END;
$function$;

-- Function to check if user is team member
CREATE OR REPLACE FUNCTION public.is_team_member(user_uuid uuid, team_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
    user_profile_id uuid;
BEGIN
    -- Get user's profile ID
    SELECT id INTO user_profile_id FROM public.profiles WHERE user_id = user_uuid;
    
    -- Check if user is a member of the team
    RETURN EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = team_uuid AND user_id = user_profile_id
    );
END;
$function$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Managers can manage their team members" ON public.team_members;
DROP POLICY IF EXISTS "Staff can view their teams" ON public.teams;
DROP POLICY IF EXISTS "Managers can manage team tasks" ON public.tasks;

-- Recreate team policies without recursion
CREATE POLICY "Managers can view all teams in their branch" 
ON public.teams 
FOR SELECT 
USING (
    get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'manager'::text])
);

CREATE POLICY "Managers can create teams" 
ON public.teams 
FOR INSERT 
WITH CHECK (
    get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'manager'::text])
);

CREATE POLICY "Managers can update their teams" 
ON public.teams 
FOR UPDATE 
USING (
    get_user_role(auth.uid()) = 'admin'::text OR 
    manager_id = get_user_profile_id(auth.uid())
);

CREATE POLICY "Managers can delete their teams" 
ON public.teams 
FOR DELETE 
USING (
    get_user_role(auth.uid()) = 'admin'::text OR 
    manager_id = get_user_profile_id(auth.uid())
);

-- Recreate team_members policies without recursion
CREATE POLICY "Team managers can manage their team members" 
ON public.team_members 
FOR ALL 
USING (
    get_user_role(auth.uid()) = 'admin'::text OR 
    is_team_manager(auth.uid(), team_id)
);

CREATE POLICY "Users can view their own team memberships" 
ON public.team_members 
FOR SELECT 
USING (
    user_id = get_user_profile_id(auth.uid())
);

-- Update tasks policy
CREATE POLICY "Team managers can manage their team tasks" 
ON public.tasks 
FOR ALL 
USING (
    get_user_role(auth.uid()) = 'admin'::text OR 
    (team_id IS NOT NULL AND is_team_manager(auth.uid(), team_id))
);