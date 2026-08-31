import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game Build - Two Steps Studio",
  // Not public yet -- keep it out of search results even though the page
  // itself is already admin-gated and excluded from robots.txt.
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
