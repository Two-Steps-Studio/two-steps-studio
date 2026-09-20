import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase-server";

// Stripe configuration
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-10-29.clover",
    })
  : null;

export async function POST(req: NextRequest) {
  // Check if Stripe is configured
  if (!stripe) {
    return NextResponse.json(
      { error: "Webhook disabled - Stripe not configured" },
      { status: 503 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Brak podpisu webhooka" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Błąd weryfikacji webhooka:", err);
    return NextResponse.json(
      { error: "Błąd weryfikacji webhooka" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const beatId = session.metadata?.beat_id;
    const tier = session.metadata?.tier;
    const serviceId = session.metadata?.serviceId;
    const userId = session.metadata?.userId;
    const amount = session.amount_total ? session.amount_total / 100 : 0;

    if (beatId && tier) {
      // Beat purchase logic
      let supabase;
      try {
        supabase = createServiceClient();
      } catch {
        console.log('[Webhook] Supabase not configured - skipping order processing');
        return NextResponse.json({ received: true });
      }

      try {
        const { data: existing } = await supabase
          .from("beat_sales")
          .select("id")
          .eq("stripe_session_id", session.id)
          .maybeSingle();

        if (!existing) {
          await supabase
            .from("beats")
            .update({
              status: "sold",
              tier: tier,
              sold_at: new Date().toISOString(),
            })
            .eq("id", beatId);

          await supabase.from("beat_sales").insert({
            beat_id: beatId,
            stripe_session_id: session.id,
            amount: amount,
            tier: tier,
          });
        }
      } catch (err) {
        console.error('[Webhook] Supabase error:', err);
      }
    } else if (serviceId && userId) {
      // Studio Service purchase logic
      let supabase;
      try {
        supabase = createServiceClient();
      } catch {
        console.log('[Webhook] Supabase not configured - skipping order processing');
        return NextResponse.json({ received: true });
      }

      try {
        const { error: updateError } = await supabase
          .from("service_orders")
          .update({ status: "paid", updated_at: new Date().toISOString() })
          .eq("stripe_session_id", session.id);

        if (updateError) {
          console.error('[Webhook] Error updating service order status:', updateError);
        }
      } catch (err) {
        console.error('[Webhook] Supabase error:', err);
      }
    }
  }
  }

  return NextResponse.json({ received: true });
}
