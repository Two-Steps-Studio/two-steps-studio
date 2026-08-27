import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Music - Two Steps Studio",
  description: "Discover original music made in our studio - browse tracks by genre and listen to the latest releases.",
  openGraph: {
    title: "Music - Two Steps Studio",
    description: "Discover original music made in our studio - browse tracks by genre and listen to the latest releases.",
    url: "https://twostepsstudio.gg/records/music",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
