-- Create feedback form settings table
CREATE TABLE public.feedback_form_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID,
  logo_url TEXT,
  welcome_title TEXT NOT NULL DEFAULT 'Welcome! 🍽️',
  welcome_description TEXT NOT NULL DEFAULT 'We''d love to hear your feedback',
  primary_color TEXT DEFAULT '#3b82f6',
  background_color TEXT DEFAULT '#ffffff',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(branch_id)
);

-- Enable Row Level Security
ALTER TABLE public.feedback_form_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for feedback form settings
CREATE POLICY "Admins can manage all settings" 
ON public.feedback_form_settings 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Managers can manage their branch settings" 
ON public.feedback_form_settings 
FOR ALL 
USING (
  get_user_role(auth.uid()) = 'manager' 
  AND branch_id = get_user_branch(auth.uid())
);

CREATE POLICY "Everyone can view settings" 
ON public.feedback_form_settings 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_feedback_form_settings_updated_at
BEFORE UPDATE ON public.feedback_form_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();