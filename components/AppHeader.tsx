import Link from "next/link";
import { AppNav, LogoutButton } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";

export default async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold text-slate-900">
            De Kunst van Kunst
          </Link>
          <AppNav />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">{user.email}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
