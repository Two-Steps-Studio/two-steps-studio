import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Two Steps Studio",
  description: "Log in to your Two Steps Studio account to access your profile, the shop, and community features.",
  openGraph: {
    title: "Login - Two Steps Studio",
    description: "Log in to your Two Steps Studio account to access your profile, the shop, and community features.",
    url: "https://twostepsstudio.vercel.app/login",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
