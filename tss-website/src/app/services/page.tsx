import { createServiceClient } from "@/lib/supabase-server";
import ServicesPageClient from "./ServicesPageClient";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

// See games/page.tsx for why this moved from a client useEffect(fetch())
// to a server-side fetch passed down as props. Same service-role query
// api/services/route.ts's GET already used (studio_services has no
// public RLS read policy).
export default async function ServicesPage() {
  let initialServices: Service[] = [];
  try {
    const { data, error } = await createServiceClient()
      .from("studio_services")
      .select("*")
      .eq("is_active", true);
    if (error) throw error;
    initialServices = data || [];
  } catch (error) {
    console.error("Error fetching services:", error);
  }

  return <ServicesPageClient initialServices={initialServices} />;
}
