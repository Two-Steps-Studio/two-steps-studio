import { NextRequest, NextResponse } from "next/server";

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
    if (!body.name || !body.email || !body.discord || !body.position || !body.experience || !body.motivation) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const meta = TYPE_META[body.type];
    const discordToken = process.env.DISCORD_TOKEN;
    // First configured channel env var for this type wins, so a dedicated
    // channel can be added later without this breaking in the meantime.
    const channelId = meta.channelEnvVars.map((name) => process.env[name]).find(Boolean);

    if (!discordToken || !channelId) {
      console.error(`DISCORD_TOKEN or one of [${meta.channelEnvVars.join(", ")}] not set`);
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const embed = {
      title: meta.title,
      color: meta.color,
      fields: [
        { name: "👤 Imię i nazwisko", value: body.name, inline: true },
        { name: "📧 Email", value: body.email, inline: true },
        { name: "💬 Discord", value: body.discord, inline: true },
        { name: "🎯 Czym chce się zajmować", value: body.position, inline: false },
        { name: "💼 Doświadczenie", value: body.experience.substring(0, 1024), inline: false },
        { name: "❤️ Motywacja", value: body.motivation.substring(0, 1024), inline: false },
      ] as { name: string; value: string; inline: boolean }[],
      timestamp: new Date().toISOString(),
    };

    if (body.portfolio) {
      embed.fields.push({ name: "🔗 Portfolio/Social media", value: body.portfolio, inline: false });
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
