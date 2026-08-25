import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Regulamin - Two Steps Studio",
  description: "Pełny regulamin Two Steps Studio - zasady korzystania ze strony i serwera Discord, system kont, poziomów, ekonomii i kar.",
  openGraph: {
    title: "Regulamin - Two Steps Studio",
    description: "Pełny regulamin Two Steps Studio - zasady korzystania ze strony i serwera Discord, system kont, poziomów, ekonomii i kar.",
    url: "https://twostepsstudio.vercel.app/terms/regulations",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
