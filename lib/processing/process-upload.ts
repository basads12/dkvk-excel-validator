import type { SupabaseClient } from "@supabase/supabase-js";
import { logAudit } from "@/lib/audit/log";
import { processRowWithAddressValidation } from "@/lib/correction/engine";
import { parseExcelBuffer } from "@/lib/excel/parse";
import {
  getUnmappedSourceColumns,
  matchColumns,
  remapRowToTemplate,
} from "@/lib/template/match";
import { findDuplicateRowIndexes } from "@/lib/validation/duplicates";
import { MAX_ROWS } from "@/lib/upload/limits";
import type { TemplateColumnSchema } from "@/types";

export async function processUpload(
  supabase: SupabaseClient,
  uploadId: string,
  userId: string,
  fileBuffer: Buffer,
  templateSchema: TemplateColumnSchema
): Promise<void> {
  await supabase
    .from("uploads")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", uploadId);

  const { data: job } = await supabase
    .from("processing_jobs")
    .insert({
      upload_id: uploadId,
      status: "processing",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  try {
    const parsedRows = await parseExcelBuffer(fileBuffer);

    if (parsedRows.length === 0) {
      throw new Error("Excel-bestand bevat geen datarijen");
    }
    if (parsedRows.length > MAX_ROWS) {
      throw new Error(`Maximaal ${MAX_ROWS} rijen toegestaan`);
    }

    const sourceHeaders = Object.keys(parsedRows[0]!.values);
    const mappings = matchColumns(sourceHeaders, templateSchema);
    const unmapped = getUnmappedSourceColumns(sourceHeaders, mappings);

    const normalizedRows = parsedRows.map((row) =>
      remapRowToTemplate(row.values, mappings)
    );

    const duplicateMap = findDuplicateRowIndexes(normalizedRows);

    // Clear existing processed data
    await supabase.from("processed_rows").delete().eq("upload_id", uploadId);

    for (let i = 0; i < normalizedRows.length; i++) {
      const values = normalizedRows[i]!;
      const result = await processRowWithAddressValidation(
        i,
        values,
        templateSchema,
        duplicateMap.get(i)
      );

      let status = result.status;
      const extraCorrections = [];

      if (unmapped.length > 0 && i === 0) {
        extraCorrections.push({
          column: "Naam",
          rowIndex: i,
          originalValue: values["Naam"] ?? "",
          proposedValue: values["Naam"] ?? "",
          status: "needs_review" as const,
          confidence: 1,
          source: "column-mismatch",
          reason: `Onbekende kolommen in bronbestand: ${unmapped.join(", ")}`,
          requiresApproval: false,
        });
        status = "needs_review";
      }

      for (const mapping of mappings) {
        if (!mapping.matched && i === 0) {
          extraCorrections.push({
            column: mapping.templateColumn,
            rowIndex: i,
            originalValue: "",
            proposedValue: "",
            status: "missing_data" as const,
            confidence: 1,
            source: "column-mismatch",
            reason: `Kolom '${mapping.templateColumn}' niet gevonden in bronbestand`,
            requiresApproval: false,
          });
        }
      }

      const allCorrections = [...result.corrections, ...extraCorrections];

      const { data: processedRow, error: rowError } = await supabase
        .from("processed_rows")
        .insert({
          upload_id: uploadId,
          row_index: i,
          row_data: result.rowData,
          status: allCorrections.length > 0 ? status : result.status,
        })
        .select("id")
        .single();

      if (rowError || !processedRow) {
        throw new Error(rowError?.message ?? "Kon rij niet opslaan");
      }

      if (allCorrections.length > 0) {
        await supabase.from("cell_corrections").insert(
          allCorrections.map((c) => ({
            processed_row_id: processedRow.id,
            column_name: c.column,
            original_value: c.originalValue,
            proposed_value: c.proposedValue,
            final_value: null,
            status: c.status,
            confidence: c.confidence,
            source: c.source,
            reason: c.reason,
            requires_approval: c.requiresApproval,
            approved: c.requiresApproval ? null : c.status === "corrected" ? true : null,
          }))
        );
      }
    }

    await supabase
      .from("uploads")
      .update({
        status: "ready_for_review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", uploadId);

    if (job?.id) {
      await supabase
        .from("processing_jobs")
        .update({
          status: "ready_for_review",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    await logAudit(supabase, userId, "upload_processed", "upload", uploadId, {
      rowCount: normalizedRows.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onbekende verwerkingsfout";

    await supabase
      .from("uploads")
      .update({
        status: "error",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", uploadId);

    if (job?.id) {
      await supabase
        .from("processing_jobs")
        .update({
          status: "error",
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    throw error;
  }
}
