import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logowanie - Two Steps Studio",
  description: "Zaloguj się do swojego konta Two Steps Studio, aby uzyskać dostęp do profilu, sklepu i funkcji społeczności.",
  openGraph: {
    title: "Logowanie - Two Steps Studio",
    description: "Zaloguj się do swojego konta Two Steps Studio, aby uzyskać dostęp do profilu, sklepu i funkcji społeczności.",
    url: "https://twostepsstudio.vercel.app/login",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
