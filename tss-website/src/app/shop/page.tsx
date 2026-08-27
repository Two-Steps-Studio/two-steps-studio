"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/hooks/use-translation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShoppingCart, Shield, Frame, Palette, Check, Coins, Loader2 } from "lucide-react";

interface Product {
  id: string;
  category: "frame" | "nick_color";
  name: string;
  description: string;
  price: number;
  value: string;
}

export default function ShopPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [money, setMoney] = useState<number | null>(null);
  const [discordId, setDiscordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      // profiles.id is the Discord snowflake, not the Supabase Auth UUID -
      // same derivation used everywhere else (profile page, RLS policies).
      const id: string | null = user?.user_metadata?.provider_id || user?.id || null;
      setDiscordId(id);

      const [itemsRes, ownedRes, profileRes] = await Promise.all([
        fetch("/api/shop").then((r) => (r.ok ? r.json() : [])).catch(() => []),
        id
          ? supabase.from("user_inventory").select("item_id").eq("user_id", id)
          : Promise.resolve({ data: [] as { item_id: string }[] }),
        id
          ? supabase.from("profiles").select("money").eq("id", id).maybeSingle()
          : Promise.resolve({ data: null as { money: number } | null }),
      ]);

      setProducts(Array.isArray(itemsRes) ? itemsRes : []);
      setOwned(new Set((ownedRes.data || []).map((r: { item_id: string }) => r.item_id)));
      setMoney(profileRes.data?.money ?? 0);
      setLoading(false);
    };

    load();
  }, []);

  const handleBuy = async (product: Product) => {
    if (!supabase || !discordId) {
      toast.error(t.shopPage.loginRequired);
      return;
    }

    setBuyingId(product.id);
    // Atomic server-side RPC (balance check + deduct + grant) - see
    // db/migrations/add-shop-inventory-achievements.sql. It independently
    // verifies the caller matches p_user_id, so this can't be used to buy
    // items for someone else.
    const { data, error } = await supabase.rpc("purchase_shop_item", {
      p_user_id: discordId,
      p_item_id: product.id,
    });
    setBuyingId(null);

    if (error) {
      const msg = error.message || "";
      if (msg.includes("Insufficient balance")) toast.error(t.shopPage.insufficientBalance);
      else if (msg.includes("already owned")) toast.error(t.shopPage.alreadyOwned);
      else toast.error(t.shopPage.purchaseError);
      console.error("[Shop] purchase failed:", { name: error.name, message: error.message, code: (error as any).code });
      return;
    }

    setOwned((prev) => new Set(prev).add(product.id));
    if (Array.isArray(data) && data[0]?.new_money != null) setMoney(data[0].new_money);
    toast.success(`${t.shopPage.purchaseSuccessPrefix}${product.name}`);
  };

  const renderPreview = (product: Product) => {
    if (product.category === "nick_color") {
      return (
        <div
          className="h-16 w-16 rounded-full border-2 border-white/20 shrink-0"
          style={{ backgroundColor: product.value }}
        />
      );
    }
    // Frame preview: a ring in the frame's color/gradient around a neutral circle.
    const isAnimated = product.value === "rgb-animated";
    return (
      <div
        className="h-16 w-16 rounded-full shrink-0 flex items-center justify-center"
        style={{
          background: isAnimated
            ? "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)"
            : product.value,
        }}
      >
        <div className="h-11 w-11 rounded-full bg-[var(--bg)]" />
      </div>
    );
  };

  const categories: Array<{ key: Product["category"]; label: string; icon: React.ReactNode }> = [
    { key: "frame", label: t.shopPage.categoryFrame, icon: <Frame size={18} /> },
    { key: "nick_color", label: t.shopPage.categoryNickColor, icon: <Palette size={18} /> },
  ];

  return (
    <div className="container mx-auto p-6 mt-20 max-w-7xl pb-16">
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-black tracking-tight text-white font-[family-name:var(--font-space)] mb-4">
          {t.shopPage.title}
        </h1>
        <p className="text-xl text-zinc-400 font-[family-name:var(--font-outfit)]">
          {t.shopPage.subtitle}
        </p>
        {money !== null && (
          <Badge className="mt-4 bg-[var(--color-general)]/15 text-[var(--color-general)] border border-[var(--color-general)]/30 px-4 py-1.5 text-sm gap-2">
            <Coins size={14} /> {t.shopPage.yourBalance}: {money.toLocaleString()}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="rounded-[2.5rem] glass animate-pulse bg-white/5 border-white/10 h-40" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card className="w-full max-w-3xl mx-auto glass rounded-[2.5rem] shadow-2xl">
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto mb-6 text-zinc-400" />
            <h2 className="text-2xl font-bold mb-2 text-white">{t.shopPage.emptyTitle}</h2>
            <p className="text-zinc-400 mb-6">{t.shopPage.emptyDesc1}</p>
            <p className="text-zinc-400 mb-6">{t.shopPage.emptyDesc2}</p>
            <Button
              onClick={() => router.push("/games")}
              className="mt-6 bg-[var(--color-games)] hover:bg-[var(--color-games)]/80 text-white font-bold"
            >
              {t.shopPage.exploreGames}
            </Button>
          </CardContent>
        </Card>
      ) : (
        categories.map(({ key, label, icon }) => {
          const items = products.filter((p) => p.category === key);
          if (items.length === 0) return null;

          return (
            <div key={key} className="mb-12">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-white mb-5 font-[family-name:var(--font-space)]">
                {icon} {label}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((product) => {
                  const isOwned = owned.has(product.id);
                  const isBuying = buyingId === product.id;
                  const canAfford = money !== null && money >= product.price;

                  return (
                    <Card
                      key={product.id}
                      className="glass rounded-[2rem] shadow-2xl overflow-hidden relative transition-all duration-300 hover:shadow-[var(--color-general)]/10 hover:border-[var(--color-general)]/20"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-general)]/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                      <CardHeader className="p-6 pb-4 relative z-10 flex-row items-center gap-4">
                        {renderPreview(product)}
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg font-bold text-white truncate">{product.name}</CardTitle>
                          <p className="text-sm text-zinc-400 line-clamp-2 font-[family-name:var(--font-outfit)]">
                            {product.description}
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 relative z-10">
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-black text-white flex items-center gap-1.5">
                            <Coins size={16} className="text-[var(--color-general)]" /> {product.price}
                          </span>
                          <Button
                            onClick={() => handleBuy(product)}
                            disabled={isOwned || isBuying || !discordId || (!isOwned && !canAfford)}
                            className={`rounded-2xl font-bold transition-all ${
                              isOwned
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-[var(--color-general)] hover:bg-[var(--color-general)]/80 text-white"
                            }`}
                          >
                            {isOwned ? (
                              <>
                                <Check size={16} className="mr-2" /> {t.shopPage.owned}
                              </>
                            ) : isBuying ? (
                              <>
                                <Loader2 size={16} className="mr-2 animate-spin" /> {t.shopPage.buying}
                              </>
                            ) : (
                              <>
                                <ShoppingCart size={16} className="mr-2" /> {t.shopPage.buy}
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <div className="mt-12 text-center text-sm text-zinc-500">
        <Shield size={16} className="inline-block mr-2" />
        {t.shopPage.footerNote}
      </div>
    </div>
  );
}
