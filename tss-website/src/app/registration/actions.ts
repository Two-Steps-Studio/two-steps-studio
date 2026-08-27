'use server';

import { supabaseAdmin } from "@/lib/supabase-admin";

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

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: fullName },
    email_confirm: true // This is the key to bypass confirmation
  });

  if (authError) {
    return { error: authError.message };
  }

  if (authData.user) {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
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

  return { success: true, user: authData.user };
}
