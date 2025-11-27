import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
          persistSession: false
        }
      }
    );

    // Extract user ID from JWT token (already validated by Supabase since verify_jwt = true)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Decode JWT to get user ID (token is already validated by Supabase)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Unauthorized: Invalid token format');
    }
    
    const payload = JSON.parse(atob(tokenParts[1]));
    const userId = payload.sub;
    
    if (!userId) {
      throw new Error('Unauthorized: No user ID in token');
    }

    // Check if user is admin using the has_role function
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('Role check error:', roleError);
      throw new Error('Unauthorized: Admin access required');
    }

    const { userId: targetUserId } = await req.json();

    if (!targetUserId) {
      throw new Error('Missing required field: userId');
    }

    // Prevent deleting yourself
    if (targetUserId === userId) {
      throw new Error('Cannot delete your own account');
    }

    console.log('Admin user:', userId, 'deleting user:', targetUserId);

    // Delete the user (cascade will handle related records)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      throw deleteError;
    }

    console.log('User deleted successfully:', targetUserId);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User deleted successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
