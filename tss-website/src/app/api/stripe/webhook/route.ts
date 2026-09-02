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
    const amount = session.amount_total ? session.amount_total / 100 : 0;

    if (beatId && tier) {
      // Stripe calls this endpoint server-to-server - there's no browser
      // session/cookies on the request, so the anon createClient() used
      // here previously ran as a fully unauthenticated client. Same
      // "anon client blocked by RLS" bug already fixed this session for
      // games/music/podcasts/admin-users: it would silently fail to mark
      // the beat sold or record the sale, despite Stripe having actually
      // charged the customer. Needs the service-role client.
      let supabase;
      try {
        supabase = createServiceClient();
      } catch {
        console.log('[Webhook] Supabase not configured - skipping order processing');
        return NextResponse.json({ received: true });
      }

      try {
        // Stripe retries webhook deliveries on timeout/non-2xx, which would
        // otherwise insert a duplicate beat_sales row per retry - skip if
        // this session was already recorded.
        const { data: existing } = await supabase
          .from("beat_sales")
          .select("id")
          .eq("stripe_session_id", session.id)
          .maybeSingle();

        if (!existing) {
          // Zaktualizuj status beatu
          await supabase
            .from("beats")
            .update({
              status: "sold",
              tier: tier,
              sold_at: new Date().toISOString(),
            })
            .eq("id", beatId);

          // Zapisz transakcję
          await supabase.from("beat_sales").insert({
            beat_id: beatId,
            stripe_session_id: session.id,
            amount: amount,
            tier: tier,
          });
        }
      } catch (err) {
        console.error('[Webhook] Supabase error:', err);
        // Continue - webhook received
      }
    }
  }

  return NextResponse.json({ received: true });
}
