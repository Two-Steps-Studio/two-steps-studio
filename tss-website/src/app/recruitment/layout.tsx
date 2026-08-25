import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rekrutacja - Two Steps Studio",
  description: "Dołącz do społeczności Two Steps Studio - połącz swoje konto Discord, aby wziąć udział w procesie rekrutacji.",
  openGraph: {
    title: "Rekrutacja - Two Steps Studio",
    description: "Dołącz do społeczności Two Steps Studio - połącz swoje konto Discord, aby wziąć udział w procesie rekrutacji.",
    url: "https://twostepsstudio.vercel.app/recruitment",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
