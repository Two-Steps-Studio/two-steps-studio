import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Games - Two Steps Studio",
  description: "Przeglądaj katalog gier stworzonych przez Two Steps Studio - filtruj według kategorii, sprawdzaj szczegóły i pobieraj swoje ulubione produkcje.",
  openGraph: {
    title: "Games - Two Steps Studio",
    description: "Przeglądaj katalog gier stworzonych przez Two Steps Studio - filtruj według kategorii, sprawdzaj szczegóły i pobieraj swoje ulubione produkcje.",
    url: "https://twostepsstudio.vercel.app/games",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
