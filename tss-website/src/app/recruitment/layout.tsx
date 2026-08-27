import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recruitment - Two Steps Studio",
  description: "Join the Two Steps Studio community - connect your Discord account to take part in the recruitment process.",
  openGraph: {
    title: "Recruitment - Two Steps Studio",
    description: "Join the Two Steps Studio community - connect your Discord account to take part in the recruitment process.",
    url: "https://twostepsstudio.gg/recruitment",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
