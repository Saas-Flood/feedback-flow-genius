-- Create team_invitations table for pending invitations
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT team_invitations_role_check CHECK (role IN ('member', 'lead', 'admin')),
  CONSTRAINT team_invitations_status_check CHECK (status IN ('pending', 'accepted', 'expired')),
  UNIQUE(team_id, email)
);

-- Enable Row Level Security
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for team invitations
CREATE POLICY "Team managers can view team invitations" 
ON public.team_invitations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.teams 
    WHERE teams.id = team_invitations.team_id 
    AND teams.manager_id = auth.uid()::uuid
  )
);

CREATE POLICY "Team managers can create team invitations" 
ON public.team_invitations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teams 
    WHERE teams.id = team_invitations.team_id 
    AND teams.manager_id = auth.uid()::uuid
  )
);

CREATE POLICY "Team managers can update team invitations" 
ON public.team_invitations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.teams 
    WHERE teams.id = team_invitations.team_id 
    AND teams.manager_id = auth.uid()::uuid
  )
);

CREATE POLICY "Team managers can delete team invitations" 
ON public.team_invitations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.teams 
    WHERE teams.id = team_invitations.team_id 
    AND teams.manager_id = auth.uid()::uuid
  )
);

-- Create trigger for updating updated_at
CREATE TRIGGER update_team_invitations_updated_at
BEFORE UPDATE ON public.team_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to accept invitations when user signs up
CREATE OR REPLACE FUNCTION public.process_pending_invitations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record RECORD;
    profile_id UUID;
BEGIN
    -- Get the profile ID for the new user
    SELECT id INTO profile_id 
    FROM public.profiles 
    WHERE user_id = NEW.id;
    
    -- Process all pending invitations for this email
    FOR invitation_record IN 
        SELECT * FROM public.team_invitations 
        WHERE email = NEW.email 
        AND status = 'pending' 
        AND expires_at > now()
    LOOP
        -- Add user to team
        INSERT INTO public.team_members (team_id, user_id, role)
        VALUES (invitation_record.team_id, profile_id, invitation_record.role)
        ON CONFLICT (team_id, user_id) DO NOTHING;
        
        -- Mark invitation as accepted
        UPDATE public.team_invitations 
        SET status = 'accepted', updated_at = now()
        WHERE id = invitation_record.id;
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- Create trigger to process invitations after user signup
CREATE TRIGGER on_auth_user_process_invitations
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.process_pending_invitations();