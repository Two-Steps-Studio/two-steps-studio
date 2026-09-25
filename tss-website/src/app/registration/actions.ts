'use server';

import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendAccountConfirmationEmail, isResendConfigured } from "@/lib/resend";
import { checkRateLimit } from "@/lib/api-rate-limit";

import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Niepoprawny format adresu e-mail"),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
  fullName: z.string().min(2, "Imię i nazwisko jest wymagane"),
  language: z.enum(["pl", "en", "de"]).default("en"),
  ref: z.string().optional(),
});

export default async function registerUser(formData: { email: string; password: string; fullName: string; language?: string; ref?: string }) {
  // Each successful signup sends a real email via Resend - without a limit
  // here, the only thing standing between a script and either a Resend
  // quota burn or a flood of unconfirmed accounts is the site-wide 600
  // req/min limiter in proxy.ts, which is far too loose for this endpoint.
  const forwardedFor = (await headers()).get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
  const rateLimit = checkRateLimit(`register:${ip}`, "register");
  if (!rateLimit.allowed) {
    return { error: "Zbyt wiele prób rejestracji. Spróbuj ponownie za chwilę." };
  }

  const validated = registerSchema.safeParse(formData);

  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const { email, password, fullName, language, ref } = validated.data;

  // Referral link is `?ref=<referrer's profiles.id>` - validate it points at
  // a real, existing profile before storing it, so a bad/tampered value
  // can't fail the whole signup via the FK constraint on referred_by, and
  // can't be used to credit a made-up id.
  let referredBy: string | null = null;
  if (ref) {
    const { data: referrer } = await supabaseAdmin.from('profiles').select('id').eq('id', ref).maybeSingle();
    if (referrer) referredBy = referrer.id;
  }

  // generateLink(type: 'signup') creates the user (like admin.createUser did)
  // but leaves email_confirmed_at unset and hands back a real confirmation
  // link instead of auto-confirming - the account only becomes usable once
  // that link is visited. We send the link ourselves via Resend rather than
  // relying on Supabase's own confirmation email, since this project has no
  // SMTP configured on the Supabase side.
  const { data: linkData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      data: { full_name: fullName },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login?confirmed=1`,
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  const authUser = linkData.user;
  const confirmLink = linkData.properties?.action_link;

  if (authUser) {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.id,
        username: fullName,
        xp: 0,
        level: 1,
        language,
        referred_by: referredBy,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Roll back the auth user generateLink() already created above -
      // otherwise a transient DB error (or a profiles constraint
      // violation) here left a real, permanently-unconfirmed auth user
      // for this email with no matching profile row, which could then
      // block the same email from ever completing registration again.
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      if (deleteError) console.error('Error rolling back orphaned auth user:', deleteError);
      return { error: 'Rejestracja nie powiodła się: ' + profileError.message };
    }
  }

  if (confirmLink) {
    try {
      await sendAccountConfirmationEmail(email, fullName, confirmLink);
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      return {
        error: isResendConfigured
          ? 'Konto utworzone, ale nie udało się wysłać maila potwierdzającego. Skontaktuj się z administracją.'
          : 'Konto utworzone, ale wysyłka maili nie jest jeszcze skonfigurowana na serwerze (brak RESEND_API_KEY). Skontaktuj się z administracją, żeby potwierdzić konto ręcznie.',
      };
    }
  }

  return { success: true, user: authUser, requiresConfirmation: true };
}
