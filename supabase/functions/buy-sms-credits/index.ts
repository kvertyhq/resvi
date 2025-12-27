import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@12.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2022-11-15',
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        const { package_id, restaurant_id } = await req.json()

        if (!package_id || !restaurant_id) {
            throw new Error('Missing package_id or restaurant_id')
        }

        // 1. Fetch Package Details
        const { data: pkg, error: pkgError } = await supabase
            .from('sms_packages')
            .select('*')
            .eq('id', package_id)
            .single()

        if (pkgError || !pkg) throw new Error('Invalid package')

        // 2. Create Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(pkg.price * 100), // Convert to cents
            currency: pkg.currency.toLowerCase(),
            metadata: {
                type: 'sms_credit_purchase',
                restaurant_id: restaurant_id,
                package_id: package_id,
                credits: pkg.credits,
                package_name: pkg.name
            },
            payment_method_types: ['card'],
        })

        return new Response(
            JSON.stringify({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
