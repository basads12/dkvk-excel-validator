import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit/log";
import { requireUserApi } from "@/lib/auth/require-user";
import { buildExportWorkbook, exportFilename } from "@/lib/excel/export-service";
import type { CellCorrection, ProcessedRow, TemplateColumnSchema } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: uploadId } = await params;
    const { supabase, user } = await requireUserApi();

    const { data: upload } = await supabase
      .from("uploads")
      .select("*, templates(column_schema)")
      .eq("id", uploadId)
      .eq("user_id", user.id)
      .single();

    if (!upload) {
      return NextResponse.json({ error: "Upload niet gevonden" }, { status: 404 });
    }

    const { data: rows } = await supabase
      .from("processed_rows")
      .select("*")
      .eq("upload_id", uploadId)
      .order("row_index");

    const rowIds = (rows ?? []).map((r) => r.id);
    const { data: corrections } = await supabase
      .from("cell_corrections")
      .select("*")
      .in("processed_row_id", rowIds.length > 0 ? rowIds : ["none"]);

    const correctionsByRow = new Map<string, CellCorrection[]>();
    for (const c of corrections ?? []) {
      const list = correctionsByRow.get(c.processed_row_id) ?? [];
      list.push(c as CellCorrection);
      correctionsByRow.set(c.processed_row_id, list);
    }

    const template = upload.templates as { column_schema: TemplateColumnSchema };
    const buffer = await buildExportWorkbook(
      template.column_schema,
      (rows ?? []) as ProcessedRow[],
      correctionsByRow,
      new Date(upload.updated_at)
    );

    await supabase
      .from("uploads")
      .update({ status: "exported", updated_at: new Date().toISOString() })
      .eq("id", uploadId);

    await logAudit(supabase, user.id, "export", "upload", uploadId);

    const filename = exportFilename();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
