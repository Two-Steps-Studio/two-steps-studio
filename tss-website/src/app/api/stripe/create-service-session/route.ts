import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import Stripe from "stripe";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const { serviceId } = await req.json();
    const headerList = await headers();
    const authHeader = headerList.get("Authorization");

    // We need the user ID for the order.
    // In a real scenario, we'd get this from the authenticated session.
    // For this implementation, we'll assume the client provides it or we get it from the token.
    const { data: { user }, error: authError } = await createServiceClient().auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch service details from DB to prevent price manipulation
    const { data: service, error: serviceError } = await createServiceClient()
      .from("studio_services")
      .select("*")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // 2. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "blik"],
      line_items: [
        {
          price_data: {
            currency: "pln",
            product_data: {
              name: service.name,
              description: service.description,
            },
            unit_amount: Math.round(service.price * 100), // Convert to grosze
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/services/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/services`,
      metadata: {
        userId: user.id,
        serviceId: service.id,
        type: "studio_service",
      },
    });

    // 3. Record pending order in DB
    const { error: orderError } = await createServiceClient()
      .from("service_orders")
      .insert({
        user_id: user.id,
        service_id: service.id,
        stripe_session_id: session.id,
        amount: service.price,
        status: "pending",
      });

    if (orderError) {
      console.error("Error recording pending order:", orderError);
      // We don't necessarily block the checkout, but we log it.
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe session error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
