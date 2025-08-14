-- Make category_id nullable in feedback table
ALTER TABLE public.feedback ALTER COLUMN category_id DROP NOT NULL;

-- Update feedback policies to not require authentication for viewing
DROP POLICY IF EXISTS "Users can view all feedback" ON public.feedback;
CREATE POLICY "Anyone can view feedback for admin purposes" 
ON public.feedback 
FOR SELECT 
USING (true);