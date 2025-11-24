-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');

-- Create mode enum
CREATE TYPE public.work_mode AS ENUM ('AI', 'DM');

-- Create attendance status enum
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent');

-- Create absence type enum
CREATE TYPE public.absence_type AS ENUM ('sick_leave', 'casual_leave', 'emergency', 'unapproved');

-- Create source enum (common sources)
CREATE TYPE public.source_type AS ENUM ('website', 'referral', 'social_media', 'email', 'cold_call', 'other');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'employee',
  mode work_mode,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all user roles
CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL,
  absence_type absence_type,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS on attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Attendance policies
CREATE POLICY "Users can view their own attendance"
  ON public.attendance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance"
  ON public.attendance FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attendance"
  ON public.attendance FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create daily submissions table
CREATE TABLE public.daily_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source source_type NOT NULL,
  
  -- Calls & Activities
  calls_dialled INTEGER NOT NULL DEFAULT 0 CHECK (calls_dialled >= 0),
  calls_taken INTEGER NOT NULL DEFAULT 0 CHECK (calls_taken >= 0),
  rapport_built INTEGER NOT NULL DEFAULT 0 CHECK (rapport_built >= 0),
  touched_base INTEGER NOT NULL DEFAULT 0 CHECK (touched_base >= 0),
  calls_not_taken INTEGER NOT NULL DEFAULT 0 CHECK (calls_not_taken >= 0),
  others INTEGER NOT NULL DEFAULT 0 CHECK (others >= 0),
  disqualified INTEGER NOT NULL DEFAULT 0 CHECK (disqualified >= 0),
  
  -- Same Month Closing
  sm_rp INTEGER NOT NULL DEFAULT 0 CHECK (sm_rp >= 0),
  sm_enrolled INTEGER NOT NULL DEFAULT 0 CHECK (sm_enrolled >= 0),
  sm_rp_to_enrolled INTEGER NOT NULL DEFAULT 0 CHECK (sm_rp_to_enrolled >= 0),
  
  -- Follow-up Closing
  fu_rp INTEGER NOT NULL DEFAULT 0 CHECK (fu_rp >= 0),
  fu_enrolled INTEGER NOT NULL DEFAULT 0 CHECK (fu_enrolled >= 0),
  fu_rp_to_enrolled INTEGER NOT NULL DEFAULT 0 CHECK (fu_rp_to_enrolled >= 0),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS on daily submissions
ALTER TABLE public.daily_submissions ENABLE ROW LEVEL SECURITY;

-- Daily submissions policies
CREATE POLICY "Users can view their own submissions"
  ON public.daily_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own submissions"
  ON public.daily_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own submissions"
  ON public.daily_submissions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all submissions"
  ON public.daily_submissions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'employee')
  );
  
  -- Insert into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'employee')
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updating timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_daily_submissions_updated_at
  BEFORE UPDATE ON public.daily_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();