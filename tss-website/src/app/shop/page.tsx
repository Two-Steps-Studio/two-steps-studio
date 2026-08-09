"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShoppingCart, Star, Shield, Zap } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: "bg" | "frame" | "style" | "theme" | "skin" | "emblem" | "other";
  rating: number;
  stock: number;
  background?: string;
  frame?: string;
  style?: string;
}

export default function ShopPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(0);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/shop");
        const data = await res.json();
        setProducts(data || []);
      } catch (error) {
        console.error("Błąd pobierania produktów:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleBuy = (product: Product) => {
    setCart((prev) => prev + 1);
    toast.success(`Dodano do koszyka: ${product.name}`, {
      description: `Cena: ${product.price} TSS Credits`,
    });
  };

  const getCategoryIcon = (category: Product["category"]) => {
    switch (category) {
      case "bg":
        return <span className="text-lg">🖼️</span>;
      case "frame":
        return <span className="text-lg">🎭</span>;
      case "style":
        return <span className="text-lg">✨</span>;
      case "skin":
        return <ShoppingCart size={16} />;
      case "emblem":
        return <Star size={16} />;
      case "theme":
        return <Zap size={16} />;
      default:
        return <Shield size={16} />;
    }
  };

  return (
    <div className="container mx-auto p-6 mt-20 max-w-7xl">
      <div className="mb-12 text-center">
        <Badge className="bg-[var(--color-general)]/20 text-[var(--color-general)] mb-4">
          Sklep TSS
        </Badge>
        <h1 className="text-5xl font-black tracking-tight text-white font-[family-name:var(--font-space)] mb-4">
          Sklep Two Steps Studio
        </h1>
        <p className="text-xl text-zinc-400 font-[family-name:var(--font-outfit)]">
          Kupuj skórki, emblematy, motywy i więcej!
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card
              key={i}
              className="rounded-[2.5rem] glass animate-pulse bg-white/5 border-white/10 h-64"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card className="w-full max-w-3xl glass rounded-[2.5rem] shadow-2xl">
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto mb-6 text-zinc-400" />
            <h2 className="text-2xl font-bold mb-2 text-white">Sklep niedostępny</h2>
            <p className="text-zinc-400">Nasza sklep będzie dostępny wkrótce.</p>
            <Button
              onClick={() => router.push("/")}
              className="mt-6 bg-[var(--color-general)] hover:bg-[var(--color-general)]/80 text-white font-bold"
            >
              Wróć na stronę główną
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card
              key={product.id}
              className={`glass rounded-[2rem] shadow-2xl overflow-hidden relative transition-all duration-300 hover:shadow-[var(--color-general)]/10 hover:border-[var(--color-general)]/20 ${
                product.stock === 0
                  ? "opacity-50 grayscale"
                  : ""
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-general)]/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
              {product.stock === 0 && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
                  <Badge className="bg-red-500 text-white px-4 py-2">
                    Wyczerpane
                  </Badge>
                </div>
              )}
              <CardHeader className="p-6 pb-4 relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle
                      className={`text-xl font-bold transition-all duration-300 ${
                        product.stock === 0
                          ? "text-zinc-400"
                          : "text-white"
                      }`}
                    >
                      {product.name}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className={`mt-2 text-xs ${
                        product.stock === 0
                          ? "bg-zinc-700 text-zinc-400"
                          : `bg-[var(--color-general)]/20 text-[var(--color-general)]`
                      }`}
                    >
                      {getCategoryIcon(product.category)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star size={14} fill="currentColor" />
                    <span className="text-sm font-bold">{product.rating}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 relative z-10">
                <p className="text-sm text-zinc-400 mb-4 line-clamp-2 font-[family-name:var(--font-outfit)]">
                  {product.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-white">
                    {product.price} <span className="text-sm font-normal opacity-60">TSS Credits</span>
                  </span>
                  <Button
                    onClick={() => handleBuy(product)}
                    disabled={product.stock === 0}
                    className={`rounded-2xl font-bold transition-all ${
                      product.stock === 0
                        ? "bg-zinc-700 text-zinc-400"
                        : "bg-[var(--color-general)] hover:bg-[var(--color-general)]/80 text-white"
                    }`}
                  >
                    <ShoppingCart size={16} className="mr-2" />
                    Dodaj do koszyka
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-12 text-center text-sm text-zinc-500">
        <Shield size={16} className="inline-block mr-2" />
        Wszystkie produkty są testowane i sprawdzane pod kątem bezpieczeństwa
      </div>
    </div>
  );
}
