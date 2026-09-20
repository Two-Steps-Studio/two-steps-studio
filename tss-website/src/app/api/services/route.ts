import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const { data: services, error } = await createServiceClient()
      .from("studio_services")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;

    return NextResponse.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
