import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit/log";
import { requireUserApi } from "@/lib/auth/require-user";
import { processUpload } from "@/lib/processing/process-upload";
import {
  isValidXlsxFile,
  MAX_UPLOADS_PER_HOUR,
  sanitizeFilename,
  validateXlsxBuffer,
} from "@/lib/upload/limits";
import type { TemplateColumnSchema } from "@/types";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUserApi();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !isValidXlsxFile(file)) {
      return NextResponse.json(
        { error: "Alleen .xlsx bestanden tot 5 MB zijn toegestaan" },
        { status: 400 }
      );
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("uploads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= MAX_UPLOADS_PER_HOUR) {
      return NextResponse.json(
        { error: `Maximaal ${MAX_UPLOADS_PER_HOUR} uploads per uur` },
        { status: 429 }
      );
    }

    const { data: activeTemplate } = await supabase
      .from("templates")
      .select("id, column_schema")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!activeTemplate) {
      return NextResponse.json(
        { error: "Upload eerst een actieve template" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateXlsxBuffer(buffer)) {
      return NextResponse.json({ error: "Ongeldig Excel-bestand" }, { status: 400 });
    }

    const filename = sanitizeFilename(file.name);
    const { data: upload, error: uploadError } = await supabase
      .from("uploads")
      .insert({
        user_id: user.id,
        template_id: activeTemplate.id,
        status: "uploaded",
        original_filename: filename,
        storage_path: "",
      })
      .select("id")
      .single();

    if (uploadError || !upload) {
      return NextResponse.json(
        { error: uploadError?.message ?? "Upload mislukt" },
        { status: 500 }
      );
    }

    const storagePath = `${user.id}/${upload.id}/${filename}`;
    const { error: storageError } = await supabase.storage
      .from("uploads")
      .upload(storagePath, buffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: false,
      });

    if (storageError) {
      await supabase.from("uploads").delete().eq("id", upload.id);
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }

    await supabase
      .from("uploads")
      .update({ storage_path: storagePath })
      .eq("id", upload.id);

    await supabase.from("uploaded_files").insert({
      upload_id: upload.id,
      filename,
      storage_path: storagePath,
      file_size: buffer.length,
    });

    await logAudit(supabase, user.id, "file_upload", "upload", upload.id);

    await processUpload(
      supabase,
      upload.id,
      user.id,
      buffer,
      activeTemplate.column_schema as TemplateColumnSchema
    );

    return NextResponse.json({ success: true, uploadId: upload.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
