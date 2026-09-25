"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
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

export default function ServicesPageClient({ initialServices }: { initialServices: Service[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const services = initialServices;

  const handleOrder = async (serviceId: string) => {
    try {
      const res = await fetch("/api/stripe/create-service-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });
      if (res.status === 401) {
        toast.error(t.servicesPage.loginRequired);
        router.push("/login");
        return;
      }
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
      toast.error(t.servicesPage.paymentError);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "graphics": return <Palette className="text-pink-500" size={20} />;
      case "coding": return <Code className="text-blue-500" size={20} />;
      case "discord": return <Rocket className="text-indigo-500" size={20} />;
      case "music": return <Music className="text-purple-500" size={20} />;
      default: return <Rocket className="text-[var(--color-general)]" size={20} />;
    }
  };

  return (
    <div className="container mx-auto p-6 mt-20 max-w-6xl pb-20">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-black tracking-tight text-[var(--text)] font-[family-name:var(--font-space)] mb-4">
          {t.servicesPage.title}
        </h1>
        <p className="text-xl font-medium text-[var(--text-muted)] font-[family-name:var(--font-outfit)] max-w-2xl mx-auto">
          {t.servicesPage.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Card
            key={service.id}
            className="glass rounded-[2rem] border border-[var(--border-color)] shadow-xl transition-all duration-300 hover:border-[var(--color-general)]/50 hover:shadow-[var(--color-general)]/10 group"
          >
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] group-hover:border-[var(--color-general)]/30 transition-colors">
                  {getCategoryIcon(service.category)}
                </div>
                <Badge variant="outline" className="border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-muted)]">
                  {service.category}
                </Badge>
              </div>
              <CardTitle className="text-2xl font-bold text-[var(--text)] mb-2">{service.name}</CardTitle>
              <CardDescription className="text-[var(--text-muted)] leading-relaxed">
                {service.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 flex items-center justify-between">
              <div className="text-2xl font-black text-[var(--text)]">
                {service.price.toFixed(2)} <span className="text-sm font-medium text-[var(--text-muted)]">PLN</span>
              </div>
              <Button
                onClick={() => handleOrder(service.id)}
                className="rounded-2xl bg-[var(--color-general)] hover:bg-[var(--color-general)]/80 text-white font-bold px-6"
              >
                {t.servicesPage.order}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
