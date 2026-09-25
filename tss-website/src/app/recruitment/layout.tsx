import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recruitment - Two Steps Studio",
  description: "Join the Two Steps Studio community - apply through our recruitment form.",
  openGraph: {
    title: "Recruitment - Two Steps Studio",
    description: "Join the Two Steps Studio community - apply through our recruitment form.",
    url: "https://twostepsstudio.gg/recruitment",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
