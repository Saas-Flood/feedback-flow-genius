-- Fix function search path security warnings by setting search_path for all functions

-- Fix handle_new_user function (already has search_path set correctly)

-- Fix get_user_profile_id function
CREATE OR REPLACE FUNCTION public.get_user_profile_id(user_uuid uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
    RETURN (SELECT id FROM public.profiles WHERE user_id = user_uuid);
END;
$$;

-- Fix is_team_manager function
CREATE OR REPLACE FUNCTION public.is_team_manager(user_uuid uuid, team_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $$
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
$$;

-- Fix is_team_member function
CREATE OR REPLACE FUNCTION public.is_team_member(user_uuid uuid, team_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $$
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
$$;

-- Fix process_pending_invitations function
CREATE OR REPLACE FUNCTION public.process_pending_invitations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
    RETURN (SELECT role FROM public.profiles WHERE user_id = user_uuid);
END;
$$;

-- Fix get_user_branch function
CREATE OR REPLACE FUNCTION public.get_user_branch(user_uuid uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
    RETURN (SELECT branch_id FROM public.profiles WHERE user_id = user_uuid);
END;
$$;

-- Fix validate_email_format function
CREATE OR REPLACE FUNCTION public.validate_email_format(email text) 
 RETURNS boolean 
 LANGUAGE plpgsql 
 IMMUTABLE
 SET search_path = public
AS $$
BEGIN
  -- Basic email validation
  RETURN email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;