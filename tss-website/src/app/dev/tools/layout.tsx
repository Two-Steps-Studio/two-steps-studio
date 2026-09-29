import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tools - Two Steps Studio",
  description:
    "Free in-browser tools for players, creators and developers: time zone converter, text counter, unit converter, dice, team picker, timer, Discord timestamps, JSON, Base64, JWT, hashes, passwords, color picker and more.",
  openGraph: {
    title: "Tools - Two Steps Studio",
    description: "Free in-browser tools for everyone - nothing you paste leaves your browser.",
    url: "https://twostepsstudio.gg/dev/tools",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
