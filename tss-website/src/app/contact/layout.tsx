import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact - Two Steps Studio",
  description: "Have questions or a new idea to propose? Get in touch with the Two Steps Studio team through our contact form.",
  openGraph: {
    title: "Contact - Two Steps Studio",
    description: "Have questions or a new idea to propose? Get in touch with the Two Steps Studio team through our contact form.",
    url: "https://twostepsstudio.vercel.app/contact",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
