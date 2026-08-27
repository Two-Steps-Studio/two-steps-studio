import { Metadata } from "next";

export const metadata: Metadata = {
  title: "DEV - Two Steps Studio",
  description: "The Two Steps Studio development team - projects",
  openGraph: {
    title: "DEV - Two Steps Studio",
    description: "The Two Steps Studio development team - projects",
    url: "https://twostepsstudio.gg/dev",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
