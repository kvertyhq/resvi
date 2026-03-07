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
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { caller_number, restaurant_id } = await req.json();

        if (!caller_number || !restaurant_id) {
            throw new Error('Missing caller_number or restaurant_id');
        }

        // 1. Try to find a matching customer profile
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('phone', caller_number)
            .single();

        // 2. Insert into call_logs
        const { data, error } = await supabaseAdmin
            .from('call_logs')
            .insert([
                {
                    caller_number,
                    restaurant_id,
                    customer_id: profile?.id || null, // Link to profile if found
                    direction: 'inbound',
                    status: 'missed', // Default to missed until handled
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) throw error;

        return new Response(JSON.stringify({ message: 'Call logged', data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('SIP Webhook Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
