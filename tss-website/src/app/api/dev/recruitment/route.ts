import { NextRequest, NextResponse } from "next/server";

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
    if (!body.name || !body.email || !body.discord || !body.position || !body.experience || !body.motivation) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get Discord webhook URL from environment variable
    const discordWebhookUrl = process.env.DISCORD_RECRUITMENT_WEBHOOK_URL;

    if (!discordWebhookUrl) {
      console.error("DISCORD_RECRUITMENT_WEBHOOK_URL environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create Discord embed
    const embed = {
      title: "🎉 New Recruitment Application",
      color: 5814783, // Green color
      fields: [
        {
          name: "👤 Name",
          value: body.name,
          inline: true,
        },
        {
          name: "📧 Email",
          value: body.email,
          inline: true,
        },
        {
          name: "💬 Discord",
          value: body.discord,
          inline: true,
        },
        {
          name: "🎯 Position",
          value: body.position,
          inline: false,
        },
        {
          name: "💼 Experience",
          value: body.experience.substring(0, 1024), // Discord field value limit is 1024
          inline: false,
        },
        {
          name: "❤️ Motivation",
          value: body.motivation.substring(0, 1024),
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    // Add portfolio field if provided
    if (body.portfolio) {
      embed.fields.push({
        name: "🔗 Portfolio/GitHub",
        value: body.portfolio,
        inline: false,
      });
    }

    // Send to Discord webhook
    const discordResponse = await fetch(discordWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!discordResponse.ok) {
      console.error("Discord webhook failed:", await discordResponse.text());
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
