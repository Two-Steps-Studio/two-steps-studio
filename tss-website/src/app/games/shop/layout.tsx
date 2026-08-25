import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop - Two Steps Studio",
  description: "Sklep z grami, dodatkami i produktami Two Steps Studio - sprawdź, co jest już dostępne i co pojawi się w przyszłości.",
  openGraph: {
    title: "Shop - Two Steps Studio",
    description: "Sklep z grami, dodatkami i produktami Two Steps Studio - sprawdź, co jest już dostępne i co pojawi się w przyszłości.",
    url: "https://twostepsstudio.vercel.app/games/shop",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
