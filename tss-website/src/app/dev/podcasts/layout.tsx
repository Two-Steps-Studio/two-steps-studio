import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zarządzanie Podcastami - Two Steps Studio",
  description: "Panel DEV do dodawania, edytowania i usuwania podcastów w bazie Two Steps Studio.",
  openGraph: {
    title: "Zarządzanie Podcastami - Two Steps Studio",
    description: "Panel DEV do dodawania, edytowania i usuwania podcastów w bazie Two Steps Studio.",
    url: "https://twostepsstudio.vercel.app/dev/podcasts",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
