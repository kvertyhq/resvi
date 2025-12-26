import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // verify user is super admin
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

        if (authError) {
            console.error('Auth check error:', authError);
            throw new Error(`Auth Error: ${authError.message}`);
        }
        if (!user) throw new Error('Unauthorized: No user found');

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role, restaurant_id')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'super_admin' && profile?.role !== 'restaurant_admin' && profile?.role !== 'admin') {
            throw new Error('Forbidden: Admin access required');
        }

        const { action, email, password, restaurantId } = await req.json();

        // Enforce restaurant scope for non-super admins
        if (profile.role !== 'super_admin') {
            if (!profile.restaurant_id || profile.restaurant_id !== restaurantId) {
                throw new Error(`Forbidden: You can only manage your own restaurant. Profile: ${profile.restaurant_id}, Request: ${restaurantId}`);
            }
            if (action === 'invite-admin') {
                throw new Error('Forbidden: Only Super Admins can invite new admins');
            }
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        if (action === 'get-users') {
            const { data: profiles, error: profilesError } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .neq('role', 'customer')
                .neq('role', 'super_admin');

            if (profilesError) throw profilesError;

            const usersWithEmail = await Promise.all((profiles || []).map(async (p) => {
                const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(p.id);
                return {
                    ...p,
                    email: user ? user.email : null
                };
            }));

            return new Response(JSON.stringify({ users: usersWithEmail }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (action === 'invite-admin') {
            const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
            if (error) throw error;

            if (data.user) {
                await supabaseAdmin.from('profiles').update({
                    role: 'restaurant_admin',
                    restaurant_id: restaurantId
                }).eq('id', data.user.id);
            }
            return new Response(JSON.stringify({ message: 'Invite sent' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (action === 'create-staff') {
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true
            });
            if (error) throw error;

            if (data.user) {
                await supabaseAdmin.from('profiles').update({
                    role: 'staff',
                    restaurant_id: restaurantId
                }).eq('id', data.user.id);
            }
            return new Response(JSON.stringify({ message: 'Staff created' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (action === 'reset-password') {
            const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email);
            if (error) throw error;
            return new Response(JSON.stringify({ message: 'Reset password email sent' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        throw new Error('Invalid action');

    } catch (error) {
        console.error('Edge Function Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200, // Return 200 to ensure client receives the JSON body with error message
        });
    }
});

