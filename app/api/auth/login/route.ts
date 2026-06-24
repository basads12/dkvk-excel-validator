import { NextResponse } from "next/server";
import { validateEmailOrThrow } from "@/lib/auth/validate-email";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const validEmail = validateEmailOrThrow(email);

    const supabase = await createClient();
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

    const { error } = await supabase.auth.signInWithOtp({
      email: validEmail,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Inloggen mislukt";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
