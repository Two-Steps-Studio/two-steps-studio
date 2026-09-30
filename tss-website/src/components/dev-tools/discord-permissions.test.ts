import { describe, expect, it } from "vitest";
import { PERMISSIONS, fromInteger, inviteUrl, isSnowflake, toInteger } from "./discord-permissions";

describe("permission list", () => {
  it("has unique names and bits", () => {
    expect(new Set(PERMISSIONS.map((p) => p.name)).size).toBe(PERMISSIONS.length);
    expect(new Set(PERMISSIONS.map((p) => p.bit)).size).toBe(PERMISSIONS.length);
  });

  // Spot checks against discord-api-types PermissionFlagsBits.
  it.each([
    ["Administrator", "8"],
    ["SendMessages", "2048"],
    ["UseApplicationCommands", "2147483648"],
    ["ModerateMembers", "1099511627776"],
    ["SendPolls", "562949953421312"],
    ["BypassSlowmode", "4503599627370496"],
  ])("%s = %s", (name, value) => {
    expect(toInteger([name]).toString()).toBe(value);
  });
});

describe("toInteger / fromInteger", () => {
  it("round-trips a typical bot permission set", () => {
    const names = ["ViewChannel", "SendMessages", "EmbedLinks", "ReadMessageHistory", "UseApplicationCommands", "Connect", "Speak"];
    const n = toInteger(names);
    expect(n.toString()).toBe("2150714368"); // same as discord.js PermissionFlagsBits OR-ed together
    expect(fromInteger(n).names.sort()).toEqual([...names].sort());
  });

  it("reports bits it doesn't know", () => {
    const n = toInteger(["SendMessages"]) | (BigInt(1) << BigInt(47));
    expect(fromInteger(n)).toEqual({ names: ["SendMessages"], unknownBits: [47] });
  });
});

describe("invite link", () => {
  it("builds the OAuth2 URL", () => {
    expect(inviteUrl("123456789012345678", BigInt(2048), ["bot", "applications.commands"])).toBe(
      "https://discord.com/oauth2/authorize?client_id=123456789012345678&scope=bot%20applications.commands&permissions=2048"
    );
  });

  it("validates application ids", () => {
    expect(isSnowflake("123456789012345678")).toBe(true);
    expect(isSnowflake("12345")).toBe(false);
    expect(isSnowflake("abc")).toBe(false);
  });
});
