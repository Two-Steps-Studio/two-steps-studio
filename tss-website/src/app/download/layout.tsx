import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download - Two Steps Studio",
  description: "Download the Two Steps Studio desktop app for Windows - system notifications, tray support, and automatic updates.",
  openGraph: {
    title: "Download - Two Steps Studio",
    description: "Download the Two Steps Studio desktop app for Windows - system notifications, tray support, and automatic updates.",
    url: "https://twostepsstudio.gg/download",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
