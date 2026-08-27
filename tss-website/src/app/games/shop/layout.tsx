import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop - Two Steps Studio",
  description: "The Two Steps Studio games shop - check out what's available now and what's coming soon.",
  openGraph: {
    title: "Shop - Two Steps Studio",
    description: "The Two Steps Studio games shop - check out what's available now and what's coming soon.",
    url: "https://twostepsstudio.vercel.app/games/shop",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
