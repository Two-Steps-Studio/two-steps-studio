import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Biblioteka - Two Steps Studio",
  description: "Biblioteka zainstalowanych gier Two Steps Studio dostępna w aplikacji desktopowej - zarządzaj swoimi grami i sprawdzaj wersje instalacji.",
  openGraph: {
    title: "Biblioteka - Two Steps Studio",
    description: "Biblioteka zainstalowanych gier Two Steps Studio dostępna w aplikacji desktopowej - zarządzaj swoimi grami i sprawdzaj wersje instalacji.",
    url: "https://twostepsstudio.vercel.app/games/library",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
