import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserData {
  name: string;
  email: string;
  password: string;
  mode: 'AI' | 'DM';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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

    // Verify the requester is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin role
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

    const { users } = await req.json() as { users: UserData[] };

    if (!Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: users array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating ${users.length} users...`);

    const results = {
      success: [] as string[],
      failed: [] as { email: string; error: string }[],
    };

    for (const userData of users) {
      try {
        console.log(`Creating user: ${userData.email}`);

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            name: userData.name,
            mode: userData.mode,
            role: 'employee',
          },
        });

        if (authError) {
          console.error(`Failed to create user ${userData.email}:`, authError);
          results.failed.push({
            email: userData.email,
            error: authError.message,
          });
          continue;
        }

        console.log(`Successfully created user: ${userData.email} (${authData.user.id})`);
        results.success.push(userData.email);
      } catch (error) {
        console.error(`Error creating user ${userData.email}:`, error);
        results.failed.push({
          email: userData.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`Bulk user creation completed: ${results.success.length} successful, ${results.failed.length} failed`);

    return new Response(
      JSON.stringify({
        message: 'Bulk user creation completed',
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-bulk-users function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
