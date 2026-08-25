import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Games - Two Steps Studio",
  description: "Poznaj proces tworzenia gier w Two Steps Studio - od pierwszego prototypu, przez eksperymentowanie z mechanikami, po gotowe produkcje.",
  openGraph: {
    title: "About Games - Two Steps Studio",
    description: "Poznaj proces tworzenia gier w Two Steps Studio - od pierwszego prototypu, przez eksperymentowanie z mechanikami, po gotowe produkcje.",
    url: "https://twostepsstudio.vercel.app/games/about",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
