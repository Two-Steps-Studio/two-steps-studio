import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Usługi - Two Steps Studio",
  description: "Profesjonalne wsparcie w grafice, kodowaniu i produkcji muzycznej dla Twojego projektu.",
  openGraph: {
    title: "Usługi - Two Steps Studio",
    description: "Profesjonalne wsparcie w grafice, kodowaniu i produkcji muzycznej dla Twojego projektu.",
    url: "https://twostepsstudio.gg/services",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
