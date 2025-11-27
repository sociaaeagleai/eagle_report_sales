import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateUserData {
  userId: string;
  name?: string;
  email?: string;
  mode?: 'AI' | 'DM';
  role?: 'admin' | 'employee';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: hasAdminRole } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, name, email, mode, role } = await req.json() as UpdateUserData;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Updating user ${userId}...`);

    // Update email in auth if provided
    if (email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { email }
      );

      if (authError) {
        console.error('Error updating auth email:', authError);
        throw new Error(`Failed to update email: ${authError.message}`);
      }
    }

    // Update profile data
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (mode !== undefined) updates.mode = mode;
    if (role !== undefined) updates.role = role;

    if (Object.keys(updates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw new Error(`Failed to update profile: ${profileError.message}`);
      }
    }

    // Update role in user_roles table if role changed
    if (role !== undefined) {
      // Delete existing role
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Insert new role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (roleError) {
        console.error('Error updating user role:', roleError);
        throw new Error(`Failed to update role: ${roleError.message}`);
      }
    }

    console.log(`Successfully updated user ${userId}`);

    return new Response(
      JSON.stringify({ message: 'User updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-user function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
