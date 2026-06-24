import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { UploadStatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth/require-user";
import type { Upload } from "@/types";

export default async function UploadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const { data: upload } = await supabase
    .from("uploads")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!upload) notFound();

  const u = upload as Upload;

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/dashboard" className="mb-4 inline-block text-sm text-slate-600">
          ← Terug naar dashboard
        </Link>
        <h1 className="mb-2 text-2xl font-semibold">{u.original_filename}</h1>
        <div className="mb-6">
          <UploadStatusBadge status={u.status} />
        </div>

        {u.error_message && (
          <div className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {u.error_message}
          </div>
        )}

        <div className="flex gap-3">
          {u.status === "ready_for_review" && (
            <>
              <Link
                href={`/uploads/${u.id}/review`}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Lijst bekijken en controleren
              </Link>
              <a
                href={`/uploads/${u.id}/export`}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Exporteren naar Excel
              </a>
            </>
          )}
          {u.status === "exported" && (
            <a
              href={`/uploads/${u.id}/export`}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Opnieuw exporteren
            </a>
          )}
          {u.status === "processing" && (
            <p className="text-sm text-blue-700">Bestand wordt verwerkt...</p>
          )}
        </div>

        <dl className="mt-8 grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-slate-500">Geüpload op</dt>
            <dd>{new Date(u.created_at).toLocaleString("nl-NL")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Laatst gewijzigd</dt>
            <dd>{new Date(u.updated_at).toLocaleString("nl-NL")}</dd>
          </div>
        </dl>
      </main>
    </>
  );
}
