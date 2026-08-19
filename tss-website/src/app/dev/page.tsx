import { Metadata } from "next";

export const metadata: Metadata = {
  title: "DEV - Two Steps Studio",
  description: "Zespół deweloperski Two Steps Studio - projekty",
  openGraph: {
    title: "DEV - Two Steps Studio",
    description: "Zespół deweloperski Two Steps Studio - projekty",
    url: "https://twostepsstudio.vercel.app/dev",
  },
};

export default function DevPage() {
  return (
    <div>
      DEV
    </div>
  );
}