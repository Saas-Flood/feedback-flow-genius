-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  branch_id UUID REFERENCES public.branches(id),
  manager_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create team members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),
  team_id UUID REFERENCES public.teams(id),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Admins can manage all teams" 
ON public.teams 
FOR ALL 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::text);

CREATE POLICY "Managers can manage their branch teams" 
ON public.teams 
FOR ALL 
TO authenticated
USING (
  get_user_role(auth.uid()) = 'manager'::text 
  AND branch_id = get_user_branch(auth.uid())
);

CREATE POLICY "Staff can view their teams" 
ON public.teams 
FOR SELECT 
TO authenticated
USING (
  id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Team members policies
CREATE POLICY "Admins can manage all team members" 
ON public.team_members 
FOR ALL 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::text);

CREATE POLICY "Managers can manage their team members" 
ON public.team_members 
FOR ALL 
TO authenticated
USING (
  team_id IN (
    SELECT id FROM public.teams 
    WHERE manager_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can view their team memberships" 
ON public.team_members 
FOR SELECT 
TO authenticated
USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Tasks policies
CREATE POLICY "Admins can manage all tasks" 
ON public.tasks 
FOR ALL 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::text);

CREATE POLICY "Managers can manage team tasks" 
ON public.tasks 
FOR ALL 
TO authenticated
USING (
  team_id IN (
    SELECT id FROM public.teams 
    WHERE manager_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can view assigned tasks" 
ON public.tasks 
FOR SELECT 
TO authenticated
USING (
  assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR assigned_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their assigned tasks" 
ON public.tasks 
FOR UPDATE 
TO authenticated
USING (
  assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Add triggers for updated_at
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();