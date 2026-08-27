import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop - Two Steps Studio",
  description: "The Two Steps Studio shop for profile cosmetics - skins, badges, themes and other add-ons purchased with TSS Credits.",
  openGraph: {
    title: "Shop - Two Steps Studio",
    description: "The Two Steps Studio shop for profile cosmetics - skins, badges, themes and other add-ons purchased with TSS Credits.",
    url: "https://twostepsstudio.gg/shop",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
