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
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Used logic requires service role to update credits reliably
        )

        const { paymentIntentId } = await req.json()

        if (!paymentIntentId) {
            throw new Error('Missing paymentIntentId')
        }

        // 1. Verify with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

        if (paymentIntent.status !== 'succeeded') {
            throw new Error(`Payment not succeeded. Status: ${paymentIntent.status}`)
        }

        const { restaurant_id, package_id, credits, type } = paymentIntent.metadata

        if (type !== 'sms_credit_purchase') {
            throw new Error('Invalid transaction type')
        }

        // 2. Check if already processed
        // We can query logs using paymentIntentId as description or add a specific column later. 
        // For now, let's query `sms_credit_transactions` for this exact metadata description + restaurant or similar.
        // Better: We should store the payment_intent_id in the transaction log to ensure uniqueness.
        // I didn't add a specific `payment_intent_id` column to `credit_transactions`, but I can put it in description or json metadata if applicable.
        // Wait, the schema I created has `description`. I'll put "Stripe Purchase: pi_..." in description.

        const description = `Stripe Purchase: ${paymentIntentId}`

        const { data: existingTx } = await supabase
            .from('credit_transactions')
            .select('id')
            .eq('description', description)
            .maybeSingle()

        if (existingTx) {
            return new Response(
                JSON.stringify({ success: true, message: 'Already processed' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3. Update Custom Credits
        // We need to increment the balance.
        // First get current or insert row if missing (it should exist for restaurant_credits)
        const { data: currentCredit } = await supabase
            .from('restaurant_credits')
            .select('balance')
            .eq('restaurant_id', restaurant_id)
            .single()

        const newBalance = (currentCredit?.balance || 0) + parseInt(credits)

        // Using UPSERT (insert on conflict update)
        const { error: updateError } = await supabase
            .from('restaurant_credits')
            .upsert({
                restaurant_id: restaurant_id,
                balance: newBalance,
                updated_at: new Date().toISOString()
            })

        if (updateError) throw updateError

        // 4. Log Transaction
        const { error: txError } = await supabase
            .from('credit_transactions')
            .insert({
                restaurant_id: restaurant_id,
                amount: paymentIntent.amount / 100, // cents to currency
                credits_added: parseInt(credits),
                transaction_type: 'purchase', // enum value
                description: description
            })

        if (txError) throw txError

        return new Response(
            JSON.stringify({ success: true, newBalance }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Verify error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
