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

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
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
        // Insert first, relying on beat_sales.stripe_session_id's UNIQUE
        // constraint (db/migrations/beat-sales-idempotency.sql) for
        // idempotency instead of a check-then-write race: a retried/
        // duplicated webhook for the same session hits a 23505 unique
        // violation here and is treated as already processed, the same
        // pattern events.js uses for event_participants.
        const { error: insertError } = await supabase.from("beat_sales").insert({
          beat_id: beatId,
          stripe_session_id: session.id,
          amount: amount,
          tier: tier,
        });

        if (insertError) {
          if (insertError.code === "23505") {
            console.log("[Webhook] Beat sale already recorded for session:", session.id);
          } else {
            throw insertError;
          }
        } else {
          await supabase
            .from("beats")
            .update({
              status: "sold",
              tier: tier,
              sold_at: new Date().toISOString(),
            })
            .eq("id", beatId);
        }
      } catch (err) {
        console.error('[Webhook] Supabase error:', err);
      }
    } else if (serviceId && userId) {
      // Studio Service purchase logic
      let supabase;
      try {
        supabase = createServiceClient();
      } catch (err) {
        console.error('[Webhook] Supabase client error:', err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
      }

      try {
        // "completed" also fires for delayed payment methods before the money
        // has actually arrived - those are marked paid later, by
        // async_payment_succeeded.
        if (session.payment_status !== "paid") {
          console.log('[Webhook] Service session not paid yet, skipping:', session.id);
          return NextResponse.json({ received: true });
        }

        // Single conditional UPDATE: only a still-pending order flips to paid,
        // so a retried/duplicated webhook is a no-op without a check-then-write race.
        const { error: updateError } = await supabase
          .from("service_orders")
          .update({ status: "paid", updated_at: new Date().toISOString() })
          .eq("stripe_session_id", session.id)
          .eq("status", "pending");

        if (updateError) throw updateError;
      } catch (err) {
        console.error('[Webhook] Service fulfillment error:', err);
        return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
