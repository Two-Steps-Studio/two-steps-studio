"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-translation";
import { Palette, Code, Music, Rocket } from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

export default function DevServicesPage() {
  const { t } = useLanguage();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch("/api/services");
        if (!res.ok) throw new Error("Failed to fetch services");
        const data = await res.json();
        setServices(data);
      } catch (error) {
        console.error("Error fetching services:", error);
        toast.error("Błąd podczas ładowania usług.");
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  const handleOrder = async (serviceId: string) => {
    try {
      const res = await fetch("/api/stripe/create-service-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Wystąpił błąd podczas inicjowania płatności.");
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "graphics": return <Palette className="text-pink-500" size={20} />;
      case "coding": return <Code className="text-blue-500" size={20} />;
      case "discord": return <Rocket className="text-indigo-500" size={20} />;
      case "music": return <Music className="text-purple-500" size={20} />;
      default: return <Rocket className="text-[var(--color-dev)]" size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-dev)]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 mt-20 max-w-6xl pb-20">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-black tracking-tight text-white font-[family-name:var(--font-space)] mb-4">
          {t.devPage.servicesTitle || "Nasze Usługi"}
        </h1>
        <p className="text-xl font-medium text-zinc-400 font-[family-name:var(--font-outfit)] max-w-2xl mx-auto">
          {t.devPage.servicesSubtitle || "Profesjonalne wsparcie w dziedzinie grafiki, kodowania i produkcji muzycznej dla Twojego projektu."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Card
            key={service.id}
            className="glass rounded-[2rem] border border-white/10 shadow-xl transition-all duration-300 hover:border-[var(--color-dev)]/50 hover:shadow-[var(--color-dev)]/10 group"
          >
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:border-[var(--color-dev)]/30 transition-colors">
                  {getCategoryIcon(service.category)}
                </div>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-400">
                  {service.category}
                </Badge>
              </div>
              <CardTitle className="text-2xl font-bold text-white mb-2">{service.name}</CardTitle>
              <CardDescription className="text-zinc-400 leading-relaxed">
                {service.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 flex items-center justify-between">
              <div className="text-2xl font-black text-white">
                {service.price.toFixed(2)} <span className="text-sm font-medium text-zinc-500">PLN</span>
              </div>
              <Button
                onClick={() => handleOrder(service.id)}
                className="rounded-2xl bg-[var(--color-dev)] hover:bg-[var(--color-dev)]/80 text-black font-bold px-6"
              >
                Zamów
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
