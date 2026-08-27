import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Two Steps Studio",
  description: "Two Steps Studio's terms of service - rules for using our games, websites, apps, and Discord community.",
  openGraph: {
    title: "Terms of Service - Two Steps Studio",
    description: "Two Steps Studio's terms of service - rules for using our games, websites, apps, and Discord community.",
    url: "https://twostepsstudio.gg/terms",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
