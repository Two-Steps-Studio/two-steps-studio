import { usePathname } from "next/navigation";

export const SECTIONS = {
  GAMES: {
    path: "/games",
    logo: "/assets/Logo/Games/Two Steps Studio Games Bez Tła.png",
    color: "#F43F5E",
  },
  RECORDS: {
    path: "/records",
    logo: "/assets/Logo/Records/Two Steps Studio Records Bez Tła.png",
    color: "#ad83f8",
  },
  DEV: {
    path: "/dev",
    logo: "/assets/Logo/DEV/Two Steps Studio DEV Bez Tła.png",
    color: "#F59E0B",
  },
    DEFAULT: {
      path: "/",
      logo: "/assets/Logo/Glowne/Two Steps Studio Bez Tła.png",
      color: "#0EA5E9",
    },
};

export function useSectionTheme() {
  const pathname = usePathname();

  const currentSection = Object.values(SECTIONS).find((s) => 
    s !== SECTIONS.DEFAULT && pathname.startsWith(s.path)
  ) || SECTIONS.DEFAULT;

  return currentSection;
}
