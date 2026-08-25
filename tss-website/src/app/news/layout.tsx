import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aktualności - Two Steps Studio",
  description: "Ostatnie wiadomości i ogłoszenia ze Studia Two Steps - bądź na bieżąco z nowymi projektami i wydarzeniami.",
  openGraph: {
    title: "Aktualności - Two Steps Studio",
    description: "Ostatnie wiadomości i ogłoszenia ze Studia Two Steps - bądź na bieżąco z nowymi projektami i wydarzeniami.",
    url: "https://twostepsstudio.vercel.app/news",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
