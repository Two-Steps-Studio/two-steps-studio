import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Two Steps Studio",
  description: "Regulamin korzystania z usług Two Steps Studio - zasady użytkowania gier, stron internetowych, aplikacji i społeczności Discord.",
  openGraph: {
    title: "Terms of Service - Two Steps Studio",
    description: "Regulamin korzystania z usług Two Steps Studio - zasady użytkowania gier, stron internetowych, aplikacji i społeczności Discord.",
    url: "https://twostepsstudio.vercel.app/terms",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
