'use server';

import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendAccountConfirmationEmail, isResendConfigured } from "@/lib/resend";

import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Niepoprawny format adresu e-mail"),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
  fullName: z.string().min(2, "Imię i nazwisko jest wymagane"),
  language: z.enum(["pl", "en", "de"]).default("en"),
  ref: z.string().optional(),
});

export default async function registerUser(formData: { email: string; password: string; fullName: string; language?: string; ref?: string }) {
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
      // If profile creation fails, we might want to delete the user or just return an error.
      // For now, let's log it and return the error.
      console.error('Error creating profile:', profileError);
      return { error: 'User created but profile creation failed: ' + profileError.message };
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
