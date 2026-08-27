import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Games - Two Steps Studio",
  description: "Browse the catalog of games made by Two Steps Studio - filter by category, check details, and download your favorite titles.",
  openGraph: {
    title: "Games - Two Steps Studio",
    description: "Browse the catalog of games made by Two Steps Studio - filter by category, check details, and download your favorite titles.",
    url: "https://twostepsstudio.gg/games",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
