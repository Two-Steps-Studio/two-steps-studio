import { NextRequest, NextResponse } from "next/server";
import { getBotSetting } from "@/lib/bot-settings";
import { createServiceClient } from "@/lib/supabase-server";

interface RecruitmentFormData {
  name: string;
  email: string;
  discord: string;
  position: string;
  experience: string;
  motivation: string;
  portfolio: string;
}

// Discord rejects the whole embed (400) if any field value exceeds
// 1024 chars, and none of these free-text fields had a length limit
// anywhere before. Escaped before truncating so an applicant can't use
// Discord markdown (masked links, bold/strikethrough) to make submitted
// text render as something other than plain text in the staff embed.
const escapeMd = (s: string) => s.replace(/([\\`*_~|>\[\]()])/g, '\\$1');
const clip = (s: string) => escapeMd(s).substring(0, 1024);

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

    // Persisted first (source of truth) - the Discord post below is now
    // just a best-effort notification on top of this, not the only
    // record of the application. See db/migrations/add-recruitment-applications.sql
    // for why: this form had no persistence at all before, so a failed
    // Discord post meant the application was gone for good.
    let supabase;
    try {
      supabase = createServiceClient();
    } catch (error) {
      console.error("[Recruitment] Supabase not configured:", error);
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const { error: insertError } = await supabase.from("recruitment_applications").insert({
      source: "dev_recruitment",
      type: "dev",
      name: body.name.trim(),
      email: body.email.trim(),
      discord: body.discord.trim(),
      position: body.position.trim(),
      experience: body.experience.trim(),
      motivation: body.motivation.trim(),
      portfolio: body.portfolio?.trim() || null,
    });

    if (insertError) {
      console.error("[Recruitment] Insert failed:", insertError.message);
      return NextResponse.json({ error: "Failed to save application" }, { status: 500 });
    }

    // Discord notification - best-effort from here on. The application is
    // already safely persisted above, so a Discord hiccup no longer means
    // losing it; staff can still see it via /admin/recruitment.
    try {
      // Sent as the actual Discord bot (Bot token + channel message), not an
      // incoming webhook — same server, same channel, but the message now
      // comes from the bot's own account instead of a generic webhook persona.
      const discordToken = process.env.DISCORD_TOKEN;
      const channelId = await getBotSetting("DISCORD_RECRUITMENT_CHANNEL_ID");

      if (!discordToken || !channelId) {
        console.error("[Recruitment] DISCORD_TOKEN or DISCORD_RECRUITMENT_CHANNEL_ID not set - application saved, notification skipped");
      } else {
        const embed = {
          title: "🎉 New Recruitment Application",
          color: 5814783, // Green color
          fields: [
            { name: "👤 Name", value: clip(body.name), inline: true },
            { name: "📧 Email", value: clip(body.email), inline: true },
            { name: "💬 Discord", value: clip(body.discord), inline: true },
            { name: "🎯 Position", value: clip(body.position), inline: false },
            { name: "💼 Experience", value: clip(body.experience), inline: false },
            { name: "❤️ Motivation", value: clip(body.motivation), inline: false },
          ] as { name: string; value: string; inline: boolean }[],
          timestamp: new Date().toISOString(),
        };

        if (body.portfolio) {
          embed.fields.push({ name: "🔗 Portfolio/GitHub", value: clip(body.portfolio), inline: false });
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
            body: JSON.stringify({ embeds: [embed] }),
          }
        );

        if (!discordResponse.ok) {
          console.error("[Recruitment] Discord notification failed (application saved):", await discordResponse.text());
        }
      }
    } catch (notifyError) {
      console.error("[Recruitment] Discord notification error (application saved):", notifyError);
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
