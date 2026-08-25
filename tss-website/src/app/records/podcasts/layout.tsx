import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Podcasty - Two Steps Studio",
  description: "Posłuchaj podcastów i rozmów z naszego studia - przeglądaj odcinki według sezonu i twórców.",
  openGraph: {
    title: "Podcasty - Two Steps Studio",
    description: "Posłuchaj podcastów i rozmów z naszego studia - przeglądaj odcinki według sezonu i twórców.",
    url: "https://twostepsstudio.vercel.app/records/podcasts",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
