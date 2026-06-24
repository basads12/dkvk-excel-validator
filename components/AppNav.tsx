"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
    >
      Uitloggen
    </button>
  );
}

export function AppNav() {
  return (
    <nav className="flex gap-4 text-sm">
      <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
        Dashboard
      </Link>
      <Link href="/templates" className="text-slate-600 hover:text-slate-900">
        Templates
      </Link>
    </nav>
  );
}
