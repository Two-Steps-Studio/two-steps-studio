import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beaty - Two Steps Studio",
  description: "Przeglądaj i kupuj beaty Two Steps Studio - od darmowych licencji po ekskluzywne prawa autorskie.",
  openGraph: {
    title: "Beaty - Two Steps Studio",
    description: "Przeglądaj i kupuj beaty Two Steps Studio - od darmowych licencji po ekskluzywne prawa autorskie.",
    url: "https://twostepsstudio.vercel.app/records/beats",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
