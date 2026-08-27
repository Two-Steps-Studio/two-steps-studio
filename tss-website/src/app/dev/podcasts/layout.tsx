import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Podcast Management - Two Steps Studio",
  description: "DEV panel for adding, editing and removing podcasts in the Two Steps Studio database.",
  openGraph: {
    title: "Podcast Management - Two Steps Studio",
    description: "DEV panel for adding, editing and removing podcasts in the Two Steps Studio database.",
    url: "https://twostepsstudio.vercel.app/dev/podcasts",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
