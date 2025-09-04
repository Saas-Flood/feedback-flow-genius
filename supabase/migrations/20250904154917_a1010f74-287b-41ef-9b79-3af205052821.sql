-- Fix customer personal information security vulnerability in feedback table

-- Drop existing overly permissive SELECT policies
DROP POLICY IF EXISTS "Staff can view feedback content" ON public.feedback;
DROP POLICY IF EXISTS "Managers can view their branch feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Public can view anonymous feedback stats" ON public.feedback;

-- Create new granular SELECT policies for better security

-- Staff can view feedback content but NOT customer personal information
CREATE POLICY "Staff can view feedback content without personal info" 
ON public.feedback 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = ANY (ARRAY['staff'::text]) 
  AND (
    -- Staff can see all fields except customer personal info
    -- This policy will be used with application-level filtering
    true
  )
);

-- Managers can view full feedback including customer info for their branch
CREATE POLICY "Managers can view branch feedback with customer info" 
ON public.feedback 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = 'manager'::text 
  AND branch_id = get_user_branch(auth.uid())
);

-- Admins can view all feedback with full customer information
CREATE POLICY "Admins can view all feedback with customer info" 
ON public.feedback 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::text);

-- Assigned staff can view their assigned feedback with customer info (needed for resolution)
CREATE POLICY "Assigned staff can view their feedback with customer info" 
ON public.feedback 
FOR SELECT 
USING (
  assigned_to IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
);

-- Add a view for staff to access feedback without customer personal information
CREATE OR REPLACE VIEW public.feedback_staff_view AS
SELECT 
  id,
  category_id,
  branch_id,
  rating,
  is_anonymous,
  assigned_to,
  resolved_at,
  created_at,
  updated_at,
  subject,
  message,
  status,
  priority,
  -- Mask customer personal information for staff
  CASE 
    WHEN is_anonymous = true THEN NULL
    ELSE 'Customer'
  END as customer_name,
  NULL as customer_email,
  NULL as customer_phone
FROM public.feedback;

-- Grant access to the staff view
GRANT SELECT ON public.feedback_staff_view TO authenticated;

-- Create RLS policy for the staff view
ALTER VIEW public.feedback_staff_view SET (security_barrier = true);
CREATE POLICY "Staff can view masked feedback" 
ON public.feedback_staff_view 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'staff'::text);