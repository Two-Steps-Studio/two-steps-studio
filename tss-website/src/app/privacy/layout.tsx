import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Two Steps Studio",
  description: "Polityka prywatności Two Steps Studio - dowiedz się, jakie dane zbieramy, jak je wykorzystujemy i jakie masz prawa.",
  openGraph: {
    title: "Privacy Policy - Two Steps Studio",
    description: "Polityka prywatności Two Steps Studio - dowiedz się, jakie dane zbieramy, jak je wykorzystujemy i jakie masz prawa.",
    url: "https://twostepsstudio.vercel.app/privacy",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
