import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt - Two Steps Studio",
  description: "Masz pytania lub chcesz zaproponować coś nowego? Skontaktuj się z zespołem Two Steps Studio przez formularz kontaktowy.",
  openGraph: {
    title: "Kontakt - Two Steps Studio",
    description: "Masz pytania lub chcesz zaproponować coś nowego? Skontaktuj się z zespołem Two Steps Studio przez formularz kontaktowy.",
    url: "https://twostepsstudio.vercel.app/contact",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
