import { NextRequest, NextResponse } from "next/server";

interface RecruitmentFormData {
  name: string;
  email: string;
  discord: string;
  position: string;
  experience: string;
  motivation: string;
  portfolio?: string;
}

// General studio recruitment (any role - mod, graphic, music, whatever the
// applicant writes in `position`), separate from /api/dev/recruitment
// which is specifically for the dev team. Same delivery mechanism (posts
// via the bot's own token, not an incoming webhook) so it needs no new
// Discord-side setup beyond an optional channel id.
export async function POST(request: NextRequest) {
  try {
    const body: RecruitmentFormData = await request.json();

    if (!body.name || !body.email || !body.discord || !body.position || !body.experience || !body.motivation) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const discordToken = process.env.DISCORD_TOKEN;
    // Falls back to the dev-recruitment channel if a dedicated one isn't
    // configured, rather than requiring new setup before this works at all.
    const channelId = process.env.DISCORD_GENERAL_RECRUITMENT_CHANNEL_ID || process.env.DISCORD_RECRUITMENT_CHANNEL_ID;

    if (!discordToken || !channelId) {
      console.error("DISCORD_TOKEN or DISCORD_GENERAL_RECRUITMENT_CHANNEL_ID/DISCORD_RECRUITMENT_CHANNEL_ID not set");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const embed = {
      title: "📋 Nowe zgłoszenie rekrutacyjne (ogólne)",
      color: 1815228, // TSS teal
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
