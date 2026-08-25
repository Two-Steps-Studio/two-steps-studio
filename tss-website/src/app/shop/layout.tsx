import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sklep - Two Steps Studio",
  description: "Sklep Two Steps Studio z kosmetykami profilu - skórki, emblematy, motywy i inne dodatki kupowane za TSS Credits.",
  openGraph: {
    title: "Sklep - Two Steps Studio",
    description: "Sklep Two Steps Studio z kosmetykami profilu - skórki, emblematy, motywy i inne dodatki kupowane za TSS Credits.",
    url: "https://twostepsstudio.vercel.app/shop",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
