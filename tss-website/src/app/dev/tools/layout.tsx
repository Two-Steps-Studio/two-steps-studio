import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developer Tools - Two Steps Studio",
  description:
    "Free in-browser developer tools: Discord timestamp generator and ID decoder, JSON formatter, Base64, JWT decoder, hashes, UUID and password generators, color converter and aspect ratio calculator.",
  openGraph: {
    title: "Developer Tools - Two Steps Studio",
    description: "Free in-browser developer tools - nothing you paste leaves your browser.",
    url: "https://twostepsstudio.gg/dev/tools",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
