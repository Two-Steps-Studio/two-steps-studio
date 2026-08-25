import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pobierz - Two Steps Studio",
  description: "Pobierz aplikację desktopową Two Steps Studio na Windows - powiadomienia systemowe, praca w zasobniku i automatyczne aktualizacje.",
  openGraph: {
    title: "Pobierz - Two Steps Studio",
    description: "Pobierz aplikację desktopową Two Steps Studio na Windows - powiadomienia systemowe, praca w zasobniku i automatyczne aktualizacje.",
    url: "https://twostepsstudio.vercel.app/download",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
