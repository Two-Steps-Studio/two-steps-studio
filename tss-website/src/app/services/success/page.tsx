"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-translation";

export default function ServiceSuccessPage() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto p-6 mt-20 max-w-xl text-center pb-20">
      <CheckCircle2 className="mx-auto mb-6 text-[var(--color-general)]" size={64} />
      <h1 className="text-4xl font-black tracking-tight text-white font-[family-name:var(--font-space)] mb-4">
        {t.servicesPage.successTitle}
      </h1>
      <p className="text-lg text-zinc-400 mb-8">{t.servicesPage.successMessage}</p>
      <Button asChild className="rounded-2xl bg-[var(--color-general)] hover:bg-[var(--color-general)]/80 text-white font-bold px-6">
        <Link href="/services">{t.servicesPage.backToServices}</Link>
      </Button>
    </div>
  );
}
