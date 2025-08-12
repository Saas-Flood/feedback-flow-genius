-- Create user profiles table
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'staff', 'user')),
    branch_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create branches table
CREATE TABLE public.branches (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    manager_id UUID REFERENCES public.profiles(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for branch_id in profiles
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_branch 
FOREIGN KEY (branch_id) REFERENCES public.branches(id);

-- Create feedback categories table
CREATE TABLE public.feedback_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedback table
CREATE TABLE public.feedback (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    category_id UUID NOT NULL REFERENCES public.feedback_categories(id),
    branch_id UUID REFERENCES public.branches(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    assigned_to UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedback responses table
CREATE TABLE public.feedback_responses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES public.profiles(id),
    message TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics events table
CREATE TABLE public.analytics_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    event_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role FROM public.profiles WHERE user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create security definer function to get user branch
CREATE OR REPLACE FUNCTION public.get_user_branch(user_uuid UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT branch_id FROM public.profiles WHERE user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can view all profiles" ON public.profiles
    FOR SELECT USING (public.get_user_role(auth.uid()) IN ('admin', 'manager'));

CREATE POLICY "Admins can manage all profiles" ON public.profiles
    FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for branches
CREATE POLICY "Everyone can view active branches" ON public.branches
    FOR SELECT USING (is_active = true);

CREATE POLICY "Managers can view their branch" ON public.branches
    FOR SELECT USING (manager_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage branches" ON public.branches
    FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for feedback categories
CREATE POLICY "Everyone can view active categories" ON public.feedback_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.feedback_categories
    FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for feedback
CREATE POLICY "Anyone can create feedback" ON public.feedback
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can view feedback from their branch" ON public.feedback
    FOR SELECT USING (
        public.get_user_role(auth.uid()) IN ('admin', 'manager', 'staff') AND
        (branch_id = public.get_user_branch(auth.uid()) OR public.get_user_role(auth.uid()) = 'admin')
    );

CREATE POLICY "Assigned staff can update their feedback" ON public.feedback
    FOR UPDATE USING (
        assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
        public.get_user_role(auth.uid()) IN ('admin', 'manager')
    );

-- RLS Policies for feedback responses
CREATE POLICY "Staff can view responses for accessible feedback" ON public.feedback_responses
    FOR SELECT USING (
        feedback_id IN (
            SELECT id FROM public.feedback 
            WHERE public.get_user_role(auth.uid()) IN ('admin', 'manager', 'staff') AND
            (branch_id = public.get_user_branch(auth.uid()) OR public.get_user_role(auth.uid()) = 'admin')
        )
    );

CREATE POLICY "Staff can create responses" ON public.feedback_responses
    FOR INSERT WITH CHECK (
        public.get_user_role(auth.uid()) IN ('admin', 'manager', 'staff') AND
        responder_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    );

-- RLS Policies for analytics events
CREATE POLICY "Users can create their own events" ON public.analytics_events
    FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins can view all events" ON public.analytics_events
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feedback_categories_updated_at BEFORE UPDATE ON public.feedback_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON public.feedback
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feedback_responses_updated_at BEFORE UPDATE ON public.feedback_responses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name, email)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_branch_id ON public.profiles(branch_id);
CREATE INDEX idx_feedback_category_id ON public.feedback(category_id);
CREATE INDEX idx_feedback_branch_id ON public.feedback(branch_id);
CREATE INDEX idx_feedback_status ON public.feedback(status);
CREATE INDEX idx_feedback_assigned_to ON public.feedback(assigned_to);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at);
CREATE INDEX idx_feedback_responses_feedback_id ON public.feedback_responses(feedback_id);
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at);

-- Insert default feedback categories
INSERT INTO public.feedback_categories (name, description, icon, color, sort_order) VALUES
('General', 'General feedback and suggestions', 'MessageSquare', '#6366f1', 1),
('Service Quality', 'Feedback about service quality', 'Star', '#f59e0b', 2),
('Staff Behavior', 'Comments about staff interaction', 'Users', '#10b981', 3),
('Product Quality', 'Feedback about products', 'Package', '#ef4444', 4),
('Facilities', 'Comments about facilities and environment', 'Building', '#8b5cf6', 5),
('Complaint', 'Formal complaints', 'AlertTriangle', '#dc2626', 6),
('Suggestion', 'Improvement suggestions', 'Lightbulb', '#059669', 7);