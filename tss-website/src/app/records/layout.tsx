import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Beats, Podcasts and Music - Two Steps Studio',
  description: 'Beatmaps, podcasts and original music. Discover the latest releases from Two Steps Studio. Connect with fans and creators.',
  openGraph: {
    title: 'Beats and Music - Two Steps Studio',
    description: 'Beats, podcasts and original music. Discover the latest releases from Two Steps Studio.',
    url: 'https://twostepsstudio.vercel.app/records',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
