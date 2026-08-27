import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registration - Two Steps Studio",
  description: "Create a Two Steps Studio account and join the community - get access to your profile, the shop, and community features.",
  openGraph: {
    title: "Registration - Two Steps Studio",
    description: "Create a Two Steps Studio account and join the community - get access to your profile, the shop, and community features.",
    url: "https://twostepsstudio.gg/registration",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
