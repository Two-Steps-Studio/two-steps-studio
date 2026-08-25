import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Beaty, Podcasty i Muzyka - Two Steps Studio',
  description: 'Beattmapy, podcasty i oryginalna muzyka. Odkryj najnowsze wydania ze Studia Two Steps. Łącz się z fanami i twórcami.',
  openGraph: {
    title: 'Beatmapy i Muzyka - Two Steps Studio',
    description: 'Beaty, podcasty i oryginalna muzyka. Odkryj najnowsze wydania ze Studia Two Steps.',
    url: 'https://twostepsstudio.vercel.app/records',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
