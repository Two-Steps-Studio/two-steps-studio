// Shared between the own-profile page and the public profile-viewing page
// so achievement unlock logic can't drift between the two.

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string | null;
  image_url: string | null; // real artwork, once designed - takes priority over the emoji/lucide icon fallback
  rarity: string;
  requirement_type: "level" | "messages" | "voice_minutes" | null;
  requirement_value: number | null;
}

export const RARITY_COLOR: Record<string, string> = {
  common: "#9e9e9e",
  rare: "#2da4f3",
  epic: "#ad83f8",
  legendary: "#ffcb2f",
};

// Achievement unlock state is a pure function of profile stats vs. each
// achievement's requirement - there's nothing persisted to keep in sync
// (see db/migrations/add-achievement-tracking.sql).
export function statForRequirement(
  type: Achievement["requirement_type"],
  profile: { level?: number; total_messages?: number; total_voice_minutes?: number } | null | undefined
): number {
  if (type === "level") return profile?.level || 1;
  if (type === "messages") return profile?.total_messages || 0;
  if (type === "voice_minutes") return profile?.total_voice_minutes || 0;
  return 0;
}
