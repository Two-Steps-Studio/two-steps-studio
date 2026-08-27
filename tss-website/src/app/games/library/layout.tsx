import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Library - Two Steps Studio",
  description: "Your library of installed Two Steps Studio games, available in the desktop app - manage your games and check installed versions.",
  openGraph: {
    title: "Library - Two Steps Studio",
    description: "Your library of installed Two Steps Studio games, available in the desktop app - manage your games and check installed versions.",
    url: "https://twostepsstudio.gg/games/library",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
