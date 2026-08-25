import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase-server";

// Stripe requires a configured instance
if (!process.env.STRIPE_SECRET_KEY) {
  // Stripe is not configured - this route will fail gracefully in the catch block
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-10-29.clover",
    })
  : null;

export async function POST(req: NextRequest) {
  // Check if Stripe is configured
  if (!stripe) {
    console.log('[Stripe] Checkout disabled - Stripe not configured');
    return NextResponse.json(
      { error: "Płatności Stripe nie są skonfigurowane" },
      { status: 503 }
    );
  }

  try {
    const { beatId, beatTitle, tier } = await req.json();

    if (!beatId || !beatTitle || !tier) {
      return NextResponse.json(
        { error: "Brak wymaganych danych" },
        { status: 400 }
      );
    }

    // SECURITY: Never trust a client-supplied price. Look up the
    // authoritative price server-side; beats with no real beat_packages row
    // (sample/demo/legacy-records beats) have nothing real to sell and are
    // rejected rather than trusting whatever the client claims their price is.
    const supabase = await createClient();
    const { data: pkg, error: pkgError } = await supabase
      .from("beat_packages")
      .select("price")
      .eq("beat_id", beatId)
      .eq("tier", tier)
      .single();

    if (pkgError || !pkg) {
      return NextResponse.json(
        { error: "Nieprawidłowy beat lub licencja" },
        { status: 400 }
      );
    }

    const price = parseFloat(pkg.price);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "blik"],
      line_items: [
        {
          price_data: {
            currency: "pln",
            product_data: {
              name: `Beat: ${beatTitle}`,
              description: `Licencja ${tier.toUpperCase()}`,
              metadata: {
                beat_id: beatId,
                tier: tier,
              },
            },
            unit_amount: Math.round(price * 100), // Cena w groszach
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/beats?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/beats?canceled=true`,
      metadata: {
        beat_id: beatId,
        tier: tier,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Błąd tworzenia sesji płatności" },
      { status: 500 }
    );
  }
}
