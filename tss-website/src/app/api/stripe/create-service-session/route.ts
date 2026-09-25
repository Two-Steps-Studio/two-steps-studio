import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import { getSiteUrl } from "@/lib/site-url";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-10-29.clover",
    })
  : null;

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Płatności Stripe nie są skonfigurowane" },
      { status: 503 }
    );
  }

  try {
    const { serviceId } = await req.json();
    if (typeof serviceId !== "string" || !serviceId) {
      return NextResponse.json({ error: "Brak wymaganych danych" }, { status: 400 });
    }

    // The service-role client has no user session, so getUser() on it can
    // never succeed - identify the buyer from the request's cookie session.
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Price always comes from the DB, never from the client.
    const { data: service, error: serviceError } = await supabase
      .from("studio_services")
      .select("*")
      .eq("id", serviceId)
      .eq("is_active", true)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const siteUrl = getSiteUrl(req);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "blik"],
      line_items: [
        {
          price_data: {
            currency: "pln",
            product_data: {
              name: service.name,
              description: service.description || undefined,
            },
            unit_amount: Math.round(Number(service.price) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${siteUrl}/services/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dev/services`,
      metadata: {
        userId: user.id,
        serviceId: service.id,
        type: "studio_service",
      },
    });

    const { error: orderError } = await supabase.from("service_orders").insert({
      user_id: user.id,
      service_id: service.id,
      stripe_session_id: session.id,
      amount: service.price,
      status: "pending",
    });

    if (orderError) {
      console.error("Error recording pending order:", orderError);
      return NextResponse.json(
        { error: "Failed to initialize order. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe session error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
