import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getSanitizedClientIp } from "@/lib/api-rate-limit";
import { sendEmail, isResendConfigured } from "@/lib/resend";

// contact/page.tsx used to just setTimeout() and show a success toast
// ("Symulacja wysyłania wiadomości") with no request going anywhere - every
// message submitted through the contact form was silently discarded, never
// delivered to anyone.
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "support@twostepsstudio.gg";

const requestSchema = z.object({
  email: z.string().email("Podaj poprawny adres email"),
  subject: z.string().trim().min(1, "Temat jest wymagany").max(200),
  message: z.string().trim().min(1, "Treść jest wymagana").max(5000),
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  if (!isResendConfigured) {
    return NextResponse.json(
      { error: "Formularz kontaktowy jest chwilowo niedostępny - napisz na support@twostepsstudio.gg" },
      { status: 503 }
    );
  }

  const ip = getSanitizedClientIp(req);
  const rateLimit = checkRateLimit(`contact:${ip}`, "contact");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Zbyt wiele wiadomości. Spróbuj ponownie później." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { email, subject, message } = requestSchema.parse(body);

    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:32px 20px;max-width:560px;margin:0 auto;">
        <p style="font-size:14px;color:#666;margin:0 0 24px;">Nowa wiadomość z formularza kontaktowego</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 8px;"><strong>Od:</strong> ${escapeHtml(email)}</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 16px;"><strong>Temat:</strong> ${escapeHtml(subject)}</p>
        <p style="font-size:15px;line-height:1.6;white-space:pre-line;margin:0;">${escapeHtml(message)}</p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    await sendEmail(
      CONTACT_EMAIL,
      `[Kontakt] ${subject}`,
      html,
      `Od: ${email}\nTemat: ${subject}\n\n${message}`,
      email
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || "Nieprawidłowe dane" }, { status: 400 });
    }
    console.error("[Contact] send error:", err);
    return NextResponse.json({ error: "Nie udało się wysłać wiadomości. Spróbuj ponownie później." }, { status: 500 });
  }
}
