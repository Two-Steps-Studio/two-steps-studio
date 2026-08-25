import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rejestracja - Two Steps Studio",
  description: "Załóż konto Two Steps Studio i dołącz do społeczności - zyskaj dostęp do profilu, sklepu i funkcji społecznościowych.",
  openGraph: {
    title: "Rejestracja - Two Steps Studio",
    description: "Załóż konto Two Steps Studio i dołącz do społeczności - zyskaj dostęp do profilu, sklepu i funkcji społecznościowych.",
    url: "https://twostepsstudio.vercel.app/registration",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
