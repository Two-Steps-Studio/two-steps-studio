'use server';

import { supabaseAdmin } from "@/lib/supabase-admin";

import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Niepoprawny format adresu e-mail"),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
  fullName: z.string().min(2, "Imię i nazwisko jest wymagane"),
});

export default async function registerUser(formData: { email: string; password: string; fullName: string }) {
  const validated = registerSchema.safeParse(formData);
  
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const { email, password, fullName } = validated.data;

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
        level: 1
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
