import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Two Steps Studio",
  description: "Two Steps Studio's privacy policy - learn what data we collect, how we use it, and what rights you have.",
  openGraph: {
    title: "Privacy Policy - Two Steps Studio",
    description: "Two Steps Studio's privacy policy - learn what data we collect, how we use it, and what rights you have.",
    url: "https://twostepsstudio.vercel.app/privacy",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
