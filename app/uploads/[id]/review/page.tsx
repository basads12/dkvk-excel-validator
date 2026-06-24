import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import ReviewTable from "@/components/review/ReviewTable";
import { requireUser } from "@/lib/auth/require-user";
import type {
  CellCorrection,
  ProcessedRow,
  TemplateColumnSchema,
  Upload,
} from "@/types";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const { data: upload } = await supabase
    .from("uploads")
    .select("*, templates(column_schema)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!upload) notFound();

  const u = upload as Upload & {
    templates: { column_schema: TemplateColumnSchema };
  };

  if (u.status !== "ready_for_review" && u.status !== "exported") {
    notFound();
  }

  const { data: rows } = await supabase
    .from("processed_rows")
    .select("*")
    .eq("upload_id", id)
    .order("row_index");

  const rowIds = (rows ?? []).map((r) => r.id);
  const { data: corrections } = await supabase
    .from("cell_corrections")
    .select("*")
    .in("processed_row_id", rowIds.length > 0 ? rowIds : ["none"]);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href={`/uploads/${id}`}
              className="mb-2 inline-block text-sm text-slate-600"
            >
              ← Terug
            </Link>
            <h1 className="text-2xl font-semibold">Controle: {u.original_filename}</h1>
          </div>
          <a
            href={`/uploads/${id}/export`}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Exporteren naar Excel
          </a>
        </div>

        <ReviewTable
          uploadId={id}
          templateSchema={u.templates.column_schema}
          rows={(rows ?? []) as ProcessedRow[]}
          corrections={(corrections ?? []) as CellCorrection[]}
        />
      </main>
    </>
  );
}
