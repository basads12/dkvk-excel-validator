import AppHeader from "@/components/AppHeader";
import { requireUser } from "@/lib/auth/require-user";
import type { Template } from "@/types";
import TemplatesClient from "./TemplatesClient";

export default async function TemplatesPage() {
  const { supabase, user } = await requireUser();

  const { data: templates } = await supabase
    .from("templates")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <AppHeader />
      <TemplatesClient templates={(templates ?? []) as Template[]} />
    </>
  );
}
