-- Create a default branch for the system
INSERT INTO public.branches (name, description, location, is_active)
VALUES ('Main Branch', 'Default branch for all users', 'Online', true)
ON CONFLICT DO NOTHING;

-- Update the handle_new_user function to assign the default branch
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    default_branch_id uuid;
BEGIN
    -- Get the first active branch (our default branch)
    SELECT id INTO default_branch_id 
    FROM public.branches 
    WHERE is_active = true 
    ORDER BY created_at 
    LIMIT 1;
    
    -- Insert profile with default branch
    INSERT INTO public.profiles (user_id, display_name, email, branch_id)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        default_branch_id
    );
    RETURN NEW;
END;
$$;

-- Create table for saved QR codes
CREATE TABLE public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.feedback_categories(id) ON DELETE CASCADE NOT NULL,
    qr_code_url TEXT NOT NULL,
    feedback_url TEXT NOT NULL,
    name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on qr_codes table
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for qr_codes
CREATE POLICY "Users can view their own QR codes" 
ON public.qr_codes 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.user_id = qr_codes.user_id
    )
);

CREATE POLICY "Users can create their own QR codes" 
ON public.qr_codes 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.user_id = qr_codes.user_id
    )
);

CREATE POLICY "Users can update their own QR codes" 
ON public.qr_codes 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.user_id = qr_codes.user_id
    )
);

CREATE POLICY "Users can delete their own QR codes" 
ON public.qr_codes 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.user_id = qr_codes.user_id
    )
);

-- Add trigger for qr_codes updated_at
CREATE TRIGGER update_qr_codes_updated_at
    BEFORE UPDATE ON public.qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update feedback RLS policy to allow users to see feedback from any branch (for now)
DROP POLICY IF EXISTS "Staff can view feedback from their branch" ON public.feedback;

CREATE POLICY "Users can view all feedback" 
ON public.feedback 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Ensure existing users get assigned to the default branch
UPDATE public.profiles 
SET branch_id = (
    SELECT id FROM public.branches 
    WHERE is_active = true 
    ORDER BY created_at 
    LIMIT 1
)
WHERE branch_id IS NULL;