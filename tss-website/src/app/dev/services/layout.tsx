import { Metadata } from "next";

// This route's page.tsx fetches the same /api/services data and renders
// essentially the same UI as /services/page.tsx (same Service interface,
// same handleOrder flow) - noindex rather than giving it its own
// competing title/description, so it doesn't create duplicate-content
// competition with the real /services page while that's sorted out.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
