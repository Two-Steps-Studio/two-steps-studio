import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Podcasts - Two Steps Studio",
  description: "Listen to podcasts and conversations from our studio - browse episodes by season and creator.",
  openGraph: {
    title: "Podcasts - Two Steps Studio",
    description: "Listen to podcasts and conversations from our studio - browse episodes by season and creator.",
    url: "https://twostepsstudio.gg/records/podcasts",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
