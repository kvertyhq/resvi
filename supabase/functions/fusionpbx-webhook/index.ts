import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // FusionPBX might send data via JSON or Query Params depending on configuration
        // We'll support both for robustness
        let caller_number: string | null = null;
        let restaurant_id: string | null = null;
        let direction: string = 'inbound';
        let fusion_uuid: string | null = null;

        const url = new URL(req.url);

        // Extract from Query Params (Priority for GET or certain Fusion configurations)
        caller_number = url.searchParams.get('caller_number') || url.searchParams.get('caller_id_number') || url.searchParams.get('phone');
        restaurant_id = url.searchParams.get('restaurant_id');
        fusion_uuid = url.searchParams.get('uuid') || url.searchParams.get('call_uuid');

        if (req.method === 'POST') {
            const contentType = req.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                const body = await req.json();
                caller_number = body.caller_number || body.caller_id_number || body.phone || caller_number;
                restaurant_id = body.restaurant_id || restaurant_id;
                direction = body.direction || 'inbound';
                fusion_uuid = body.uuid || body.call_uuid || fusion_uuid;
            } else if (contentType?.includes('form-data') || contentType?.includes('x-www-form-urlencoded')) {
                const formData = await req.formData();
                caller_number = formData.get('caller_number')?.toString() || formData.get('caller_id_number')?.toString() || caller_number;
                restaurant_id = formData.get('restaurant_id')?.toString() || restaurant_id;
                fusion_uuid = formData.get('uuid')?.toString() || formData.get('call_uuid')?.toString() || fusion_uuid;
            }
        }

        if (!caller_number || !restaurant_id) {
            console.error('Missing parameters:', { caller_number, restaurant_id, fusion_uuid });
            throw new Error('Missing caller_number or restaurant_id');
        }

        // Clean up caller_number (example: remove leading +, or spaces)
        const sanitized_caller_number = caller_number.replace(/\D/g, '');

        // 1. Try to find a matching customer profile
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .or(`phone.eq.${caller_number},phone.eq.${sanitized_caller_number}`)
            .limit(1)
            .maybeSingle();

        // 2. Insert into call_logs
        const { data: logData, error: logError } = await supabaseAdmin
            .from('call_logs')
            .insert([
                {
                    caller_number: caller_number,
                    restaurant_id,
                    customer_id: profile?.id || null,
                    direction: direction,
                    status: 'called',
                    fusion_uuid: fusion_uuid,

                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();


        if (logError) throw logError;

        console.log(`Call logged successfully for restaurant ${restaurant_id}: ${caller_number}`);

        return new Response(JSON.stringify({ message: 'Call logged', data: logData }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('FusionPBX Webhook Error:', error.message);
        return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
