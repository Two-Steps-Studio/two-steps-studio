import { Metadata } from "next";

export const metadata: Metadata = {
  title: "News - Two Steps Studio",
  description: "The latest news and announcements from Two Steps Studio - stay up to date with new projects and events.",
  openGraph: {
    title: "News - Two Steps Studio",
    description: "The latest news and announcements from Two Steps Studio - stay up to date with new projects and events.",
    url: "https://twostepsstudio.vercel.app/news",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
