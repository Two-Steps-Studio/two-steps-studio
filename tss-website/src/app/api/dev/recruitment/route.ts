import { NextRequest, NextResponse } from "next/server";
import { getBotSetting } from "@/lib/bot-settings";

interface RecruitmentFormData {
  name: string;
  email: string;
  discord: string;
  position: string;
  experience: string;
  motivation: string;
  portfolio: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RecruitmentFormData = await request.json();

    // Validate required fields
    if (![body.name, body.email, body.discord, body.position, body.experience, body.motivation].every((v) => v?.trim())) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Sent as the actual Discord bot (Bot token + channel message), not an
    // incoming webhook — same server, same channel, but the message now
    // comes from the bot's own account instead of a generic webhook persona.
    const discordToken = process.env.DISCORD_TOKEN;
    const channelId = await getBotSetting("DISCORD_RECRUITMENT_CHANNEL_ID");

    if (!discordToken || !channelId) {
      console.error("DISCORD_TOKEN or DISCORD_RECRUITMENT_CHANNEL_ID environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Discord rejects the whole embed (400) if any field value exceeds
    // 1024 chars - experience/motivation were already capped, but name/
    // email/discord/position/portfolio (all free text, none length-
    // limited in the form) weren't, so a long paste into any of those
    // caused the entire application to be discarded with no way to
    // recover it (this route has no persistence).
    // Escaped before truncating so an applicant can't use Discord
    // markdown (masked links, bold/strikethrough) to make submitted text
    // render as something other than plain text in the staff embed.
    const escapeMd = (s: string) => s.replace(/([\\`*_~|>\[\]()])/g, '\\$1');
    const clip = (s: string) => escapeMd(s).substring(0, 1024);

    // Create Discord embed
    const embed = {
      title: "🎉 New Recruitment Application",
      color: 5814783, // Green color
      fields: [
        {
          name: "👤 Name",
          value: clip(body.name),
          inline: true,
        },
        {
          name: "📧 Email",
          value: clip(body.email),
          inline: true,
        },
        {
          name: "💬 Discord",
          value: clip(body.discord),
          inline: true,
        },
        {
          name: "🎯 Position",
          value: clip(body.position),
          inline: false,
        },
        {
          name: "💼 Experience",
          value: clip(body.experience), // Discord field value limit is 1024
          inline: false,
        },
        {
          name: "❤️ Motivation",
          value: clip(body.motivation),
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    // Add portfolio field if provided
    if (body.portfolio) {
      embed.fields.push({
        name: "🔗 Portfolio/GitHub",
        value: clip(body.portfolio),
        inline: false,
      });
    }

    // Send via the Discord bot's REST API instead of an incoming webhook.
    const discordResponse = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bot ${discordToken}`,
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      }
    );

    if (!discordResponse.ok) {
      console.error("Discord bot message failed:", await discordResponse.text());
      return NextResponse.json(
        { error: "Failed to send notification" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Application submitted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing recruitment application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
