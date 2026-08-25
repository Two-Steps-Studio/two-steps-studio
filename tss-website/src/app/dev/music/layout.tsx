import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zarządzanie Muzyką - Two Steps Studio",
  description: "Panel DEV do dodawania, edytowania i usuwania utworów muzycznych w bazie Two Steps Studio.",
  openGraph: {
    title: "Zarządzanie Muzyką - Two Steps Studio",
    description: "Panel DEV do dodawania, edytowania i usuwania utworów muzycznych w bazie Two Steps Studio.",
    url: "https://twostepsstudio.vercel.app/dev/music",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
