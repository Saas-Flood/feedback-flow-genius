-- Remove the overly permissive feedback viewing policy
DROP POLICY IF EXISTS "Anyone can view feedback for admin purposes" ON public.feedback;

-- Create secure policies for feedback access
-- Only authenticated staff, managers, and admins can view feedback
CREATE POLICY "Staff can view feedback" 
ON public.feedback 
FOR SELECT 
TO authenticated
USING (
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'manager'::text, 'staff'::text])
);

-- Additional policy for branch-specific access (managers can only see their branch feedback)
CREATE POLICY "Managers can view their branch feedback" 
ON public.feedback 
FOR SELECT 
TO authenticated
USING (
  get_user_role(auth.uid()) = 'manager'::text 
  AND branch_id = get_user_branch(auth.uid())
);

-- Admins can view all feedback (separate policy for clarity)
CREATE POLICY "Admins can view all feedback" 
ON public.feedback 
FOR SELECT 
TO authenticated
USING (
  get_user_role(auth.uid()) = 'admin'::text
);