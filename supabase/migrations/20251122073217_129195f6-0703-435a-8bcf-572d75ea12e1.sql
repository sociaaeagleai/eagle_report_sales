-- Promote sakeel@socialeagle.ai to admin role
-- This will update the user's role after they sign up

-- Update the profiles table
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'sakeel@socialeagle.ai';

-- Update the user_roles table
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM public.profiles WHERE email = 'sakeel@socialeagle.ai'
);