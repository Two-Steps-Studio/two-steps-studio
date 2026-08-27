import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Regulations - Two Steps Studio",
  description: "The full Two Steps Studio regulations - rules for using the website and Discord server, and the account, level, economy and penalty systems.",
  openGraph: {
    title: "Regulations - Two Steps Studio",
    description: "The full Two Steps Studio regulations - rules for using the website and Discord server, and the account, level, economy and penalty systems.",
    url: "https://twostepsstudio.gg/terms/regulations",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
