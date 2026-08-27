import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recruitment - Two Steps Studio",
  description: "Join the Two Steps Studio development team - we're looking for people ready to build, experiment, and grow their own ideas with us.",
  openGraph: {
    title: "Recruitment - Two Steps Studio",
    description: "Join the Two Steps Studio development team - we're looking for people ready to build, experiment, and grow their own ideas with us.",
    url: "https://twostepsstudio.vercel.app/dev/recruitment",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
