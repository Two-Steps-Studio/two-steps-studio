import { NextRequest, NextResponse } from "next/server";
import { getBotSetting } from "@/lib/bot-settings";

interface RecruitmentFormData {
  type: "dev" | "discord_admin";
  name: string;
  email: string;
  discord: string;
  position: string;
  experience: string;
  motivation: string;
  portfolio?: string;
}

const TYPE_META: Record<RecruitmentFormData["type"], { title: string; color: number; channelEnvVars: string[] }> = {
  // Routed to the same channel /api/dev/recruitment already uses, so dev
  // applications land in one place regardless of which form they came
  // through.
  dev: { title: "📋 Nowe zgłoszenie rekrutacyjne (Dev)", color: 1815228, channelEnvVars: ["DISCORD_RECRUITMENT_CHANNEL_ID"] },
  discord_admin: {
    title: "🛡️ Nowe zgłoszenie rekrutacyjne (Administracja Discordowa)",
    color: 0x5865f2,
    channelEnvVars: ["DISCORD_ADMIN_RECRUITMENT_CHANNEL_ID", "DISCORD_GENERAL_RECRUITMENT_CHANNEL_ID", "DISCORD_RECRUITMENT_CHANNEL_ID"],
  },
};

// Recruitment with a type selector (Dev / Discord Administration, more may
// be added later) - separate from /api/dev/recruitment, which is the
// dev-only form this one's "Dev" option is meant to feed into the same
// channel as. Same delivery mechanism (posts via the bot's own token, not
// an incoming webhook) so it needs no new Discord-side setup beyond an
// optional channel id per type.
export async function POST(request: NextRequest) {
  try {
    const body: RecruitmentFormData = await request.json();

    if (!body.type || !TYPE_META[body.type]) {
      return NextResponse.json({ error: "Invalid application type" }, { status: 400 });
    }
    if (![body.name, body.email, body.discord, body.position, body.experience, body.motivation].every((v) => v?.trim())) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const meta = TYPE_META[body.type];
    const discordToken = process.env.DISCORD_TOKEN;
    // First configured channel wins - bot_settings (set from /admin/bot's
    // channel picker) takes precedence over the .env var of the same name,
    // so a dedicated channel can be picked without a redeploy.
    const channelIds = await Promise.all(meta.channelEnvVars.map((name) => getBotSetting(name)));
    const channelId = channelIds.find(Boolean);

    if (!discordToken || !channelId) {
      console.error(`DISCORD_TOKEN or one of [${meta.channelEnvVars.join(", ")}] not set`);
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Discord rejects the whole embed (400) if any field value exceeds
    // 1024 chars - experience/motivation were already capped, but name/
    // email/discord/position/portfolio (all free text, none length-
    // limited in the form) weren't, so a long paste into any of those
    // caused the entire application to be discarded with no way to
    // recover it (this route has no persistence - see the comment above
    // POST()).
    // Escaped before truncating so an applicant can't use Discord
    // markdown (masked links like [click here](evil.example), bold/
    // strikethrough) to make submitted text render as something other
    // than plain text in the staff-facing embed.
    const escapeMd = (s: string) => s.replace(/([\\`*_~|>\[\]()])/g, '\\$1');
    const clip = (s: string) => escapeMd(s).substring(0, 1024);

    const embed = {
      title: meta.title,
      color: meta.color,
      fields: [
        { name: "👤 Imię i nazwisko", value: clip(body.name), inline: true },
        { name: "📧 Email", value: clip(body.email), inline: true },
        { name: "💬 Discord", value: clip(body.discord), inline: true },
        { name: "🎯 Czym chce się zajmować", value: clip(body.position), inline: false },
        { name: "💼 Doświadczenie", value: clip(body.experience), inline: false },
        { name: "❤️ Motywacja", value: clip(body.motivation), inline: false },
      ] as { name: string; value: string; inline: boolean }[],
      timestamp: new Date().toISOString(),
    };

    if (body.portfolio) {
      embed.fields.push({ name: "🔗 Portfolio/Social media", value: clip(body.portfolio), inline: false });
    }

    const discordResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${discordToken}`,
      },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!discordResponse.ok) {
      console.error("Discord bot message failed:", await discordResponse.text());
      return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error processing recruitment application:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
