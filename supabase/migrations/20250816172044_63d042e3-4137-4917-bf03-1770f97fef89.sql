-- Update user role to admin so they can manage feedback form settings
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = '73d70583-f9c6-4381-bf46-57e60285016d';

-- Alternative: Add a policy to allow regular users to manage settings for their branch
-- CREATE POLICY "Users can manage their branch settings" 
-- ON public.feedback_form_settings 
-- FOR ALL 
-- USING (branch_id = get_user_branch(auth.uid()));