import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { FileUploadForm } from "@/components/FileUploadForm";
import { UploadStatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth/require-user";
import type { Template, Upload } from "@/types";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  const { data: activeTemplate } = await supabase
    .from("templates")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  const { data: uploads } = await supabase
    .from("uploads")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const template = activeTemplate as Template | null;
  const uploadList = (uploads ?? []) as Upload[];

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-medium">Actieve template</h2>
            {template ? (
              <div className="mb-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">{template.name}</p>
                <p>
                  {(template.column_schema as { columns: unknown[] }).columns.length}{" "}
                  kolommen
                </p>
              </div>
            ) : (
              <p className="mb-4 text-sm text-amber-700">
                Geen actieve template. Upload eerst een voorbeeldbestand.
              </p>
            )}
            <FileUploadForm
              action="/api/templates"
              label="Upload voorbeeld-Excelbestand (.xlsx)"
              buttonText="Template uploaden"
            />
            <Link
              href="/templates"
              className="mt-3 inline-block text-sm text-slate-600 hover:text-slate-900"
            >
              Templates beheren →
            </Link>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-medium">Excel uploaden</h2>
            <FileUploadForm
              action="/api/uploads"
              label="Upload te controleren Excel-bestand (.xlsx)"
              buttonText="Upload Excel-bestand"
              disabled={!template}
            />
            {!template && (
              <p className="mt-2 text-xs text-slate-500">
                Upload eerst een actieve template voordat u bestanden kunt controleren.
              </p>
            )}
          </section>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-medium">Eerdere uploads</h2>
          {uploadList.length === 0 ? (
            <p className="text-sm text-slate-500">Nog geen uploads.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2 pr-4 font-medium">Bestand</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Datum</th>
                    <th className="pb-2 font-medium">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadList.map((upload) => (
                    <tr key={upload.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4">{upload.original_filename}</td>
                      <td className="py-3 pr-4">
                        <UploadStatusBadge status={upload.status} />
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {new Date(upload.created_at).toLocaleString("nl-NL")}
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/uploads/${upload.id}`}
                          className="text-slate-700 hover:text-slate-900"
                        >
                          Bekijken
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
