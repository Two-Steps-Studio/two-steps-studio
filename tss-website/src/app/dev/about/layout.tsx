import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us - Two Steps Studio",
  description: "DEV is the part of Two Steps Studio focused on building software, tools, and technology - learn about our approach from idea to finished project.",
  openGraph: {
    title: "About Us - Two Steps Studio",
    description: "DEV is the part of Two Steps Studio focused on building software, tools, and technology - learn about our approach from idea to finished project.",
    url: "https://twostepsstudio.gg/dev/about",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
