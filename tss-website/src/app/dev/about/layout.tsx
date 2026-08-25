import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us - Two Steps Studio",
  description: "DEV to część Two Steps Studio skupiona na tworzeniu oprogramowania, narzędzi i technologii - poznaj nasze podejście od pomysłu do gotowego projektu.",
  openGraph: {
    title: "About Us - Two Steps Studio",
    description: "DEV to część Two Steps Studio skupiona na tworzeniu oprogramowania, narzędzi i technologii - poznaj nasze podejście od pomysłu do gotowego projektu.",
    url: "https://twostepsstudio.vercel.app/dev/about",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
