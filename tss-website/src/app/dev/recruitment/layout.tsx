import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recruitment - Two Steps Studio",
  description: "Dołącz do zespołu deweloperskiego Two Steps Studio - szukamy osób gotowych tworzyć, eksperymentować i rozwijać własne pomysły razem z nami.",
  openGraph: {
    title: "Recruitment - Two Steps Studio",
    description: "Dołącz do zespołu deweloperskiego Two Steps Studio - szukamy osób gotowych tworzyć, eksperymentować i rozwijać własne pomysły razem z nami.",
    url: "https://twostepsstudio.vercel.app/dev/recruitment",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
