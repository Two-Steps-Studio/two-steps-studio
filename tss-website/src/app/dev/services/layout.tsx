import { Metadata } from "next";

// Kept as the canonical services page (the near-identical /services route
// now redirects here, see next.config.ts) rather than the other way
// around - a deliberate choice, not the "duplicate, noindex it" state
// this file used to be in.
export const metadata: Metadata = {
  title: "Usługi - Two Steps Studio",
  description: "Profesjonalne wsparcie w grafice, kodowaniu i produkcji muzycznej dla Twojego projektu.",
  openGraph: {
    title: "Usługi - Two Steps Studio",
    description: "Profesjonalne wsparcie w grafice, kodowaniu i produkcji muzycznej dla Twojego projektu.",
    url: "https://twostepsstudio.gg/dev/services",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
