// Discord permission bits (from discord-api-types 0.38.56, the package
// discord.js v14 re-exports as PermissionFlagsBits) grouped like the
// Developer Portal's bot permission picker. Names stay in English - they're
// what the portal, the API and discord.js call them.

export type PermissionGroup = "general" | "text" | "voice";
export type Permission = { name: string; bit: number; group: PermissionGroup };

export const PERMISSIONS: Permission[] = [
  { name: "Administrator", bit: 3, group: "general" },
  { name: "ViewAuditLog", bit: 7, group: "general" },
  { name: "ViewGuildInsights", bit: 19, group: "general" },
  { name: "ManageGuild", bit: 5, group: "general" },
  { name: "ManageRoles", bit: 28, group: "general" },
  { name: "ManageChannels", bit: 4, group: "general" },
  { name: "KickMembers", bit: 1, group: "general" },
  { name: "BanMembers", bit: 2, group: "general" },
  { name: "ModerateMembers", bit: 40, group: "general" },
  { name: "CreateInstantInvite", bit: 0, group: "general" },
  { name: "ChangeNickname", bit: 26, group: "general" },
  { name: "ManageNicknames", bit: 27, group: "general" },
  { name: "ManageGuildExpressions", bit: 30, group: "general" },
  { name: "CreateGuildExpressions", bit: 43, group: "general" },
  { name: "ManageWebhooks", bit: 29, group: "general" },
  { name: "ViewChannel", bit: 10, group: "general" },
  { name: "ManageEvents", bit: 33, group: "general" },
  { name: "CreateEvents", bit: 44, group: "general" },
  { name: "ViewCreatorMonetizationAnalytics", bit: 41, group: "general" },

  { name: "SendMessages", bit: 11, group: "text" },
  { name: "SendMessagesInThreads", bit: 38, group: "text" },
  { name: "CreatePublicThreads", bit: 35, group: "text" },
  { name: "CreatePrivateThreads", bit: 36, group: "text" },
  { name: "SendTTSMessages", bit: 12, group: "text" },
  { name: "ManageMessages", bit: 13, group: "text" },
  { name: "PinMessages", bit: 51, group: "text" },
  { name: "ManageThreads", bit: 34, group: "text" },
  { name: "EmbedLinks", bit: 14, group: "text" },
  { name: "AttachFiles", bit: 15, group: "text" },
  { name: "ReadMessageHistory", bit: 16, group: "text" },
  { name: "MentionEveryone", bit: 17, group: "text" },
  { name: "UseExternalEmojis", bit: 18, group: "text" },
  { name: "UseExternalStickers", bit: 37, group: "text" },
  { name: "AddReactions", bit: 6, group: "text" },
  { name: "UseApplicationCommands", bit: 31, group: "text" },
  { name: "UseEmbeddedActivities", bit: 39, group: "text" },
  { name: "UseExternalApps", bit: 50, group: "text" },
  { name: "SendVoiceMessages", bit: 46, group: "text" },
  { name: "SendPolls", bit: 49, group: "text" },
  { name: "BypassSlowmode", bit: 52, group: "text" },

  { name: "Connect", bit: 20, group: "voice" },
  { name: "Speak", bit: 21, group: "voice" },
  { name: "Stream", bit: 9, group: "voice" },
  { name: "UseSoundboard", bit: 42, group: "voice" },
  { name: "UseExternalSounds", bit: 45, group: "voice" },
  { name: "UseVAD", bit: 25, group: "voice" },
  { name: "PrioritySpeaker", bit: 8, group: "voice" },
  { name: "MuteMembers", bit: 22, group: "voice" },
  { name: "DeafenMembers", bit: 23, group: "voice" },
  { name: "MoveMembers", bit: 24, group: "voice" },
  { name: "SetVoiceChannelStatus", bit: 48, group: "voice" },
  { name: "RequestToSpeak", bit: 32, group: "voice" },
];

// BigInt(...) calls rather than 1n literals: tsconfig targets ES2017.
const ONE = BigInt(1);
const flag = (bit: number) => ONE << BigInt(bit);

export function toInteger(names: Iterable<string>): bigint {
  const byName = new Map(PERMISSIONS.map((p) => [p.name, p.bit]));
  let n = BigInt(0);
  for (const name of names) {
    const bit = byName.get(name);
    if (bit !== undefined) n |= flag(bit);
  }
  return n;
}

// Names for the set bits, plus bits no known permission uses (so a pasted
// integer from a newer API version doesn't silently lose information).
export function fromInteger(n: bigint): { names: string[]; unknownBits: number[] } {
  const names = PERMISSIONS.filter((p) => (n & flag(p.bit)) !== BigInt(0)).map((p) => p.name);
  const known = new Set(PERMISSIONS.map((p) => p.bit));
  const unknownBits: number[] = [];
  for (let bit = 0; flag(bit) <= n; bit++) {
    if ((n & flag(bit)) !== BigInt(0) && !known.has(bit)) unknownBits.push(bit);
  }
  return { names, unknownBits };
}

export const isSnowflake = (id: string) => /^\d{17,20}$/.test(id.trim());

// OAuth2 install link for a bot. `applications.commands` lets it register
// slash commands; `permissions` is what Discord pre-ticks for the new role.
export function inviteUrl(clientId: string, permissions: bigint, scopes: string[]) {
  const params = new URLSearchParams({ client_id: clientId.trim(), scope: scopes.join(" "), permissions: permissions.toString() });
  return `https://discord.com/oauth2/authorize?${params.toString().replace(/\+/g, "%20")}`;
}
