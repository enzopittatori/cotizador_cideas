"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");

  if (
    typeof emailRaw !== "string" ||
    typeof passwordRaw !== "string" ||
    !emailRaw ||
    !passwordRaw
  ) {
    redirect("/login?error=missing");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: emailRaw,
    password: passwordRaw,
  });

  if (error) {
    redirect("/login?error=invalid");
  }

  redirect("/");
}
