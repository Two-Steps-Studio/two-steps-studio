import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Muzyka - Two Steps Studio",
  description: "Odkryj oryginalną muzykę tworzoną w naszym studio - przeglądaj utwory według gatunku i posłuchaj najnowszych wydań.",
  openGraph: {
    title: "Muzyka - Two Steps Studio",
    description: "Odkryj oryginalną muzykę tworzoną w naszym studio - przeglądaj utwory według gatunku i posłuchaj najnowszych wydań.",
    url: "https://twostepsstudio.vercel.app/records/music",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
