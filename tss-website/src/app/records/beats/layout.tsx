import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beats - Two Steps Studio",
  description: "Browse and buy Two Steps Studio beats - from free licenses to exclusive full rights.",
  openGraph: {
    title: "Beats - Two Steps Studio",
    description: "Browse and buy Two Steps Studio beats - from free licenses to exclusive full rights.",
    url: "https://twostepsstudio.vercel.app/records/beats",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
