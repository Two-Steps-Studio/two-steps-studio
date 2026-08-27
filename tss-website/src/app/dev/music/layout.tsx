import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Music Management - Two Steps Studio",
  description: "DEV panel for adding, editing and removing music tracks in the Two Steps Studio database.",
  openGraph: {
    title: "Music Management - Two Steps Studio",
    description: "DEV panel for adding, editing and removing music tracks in the Two Steps Studio database.",
    url: "https://twostepsstudio.gg/dev/music",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
