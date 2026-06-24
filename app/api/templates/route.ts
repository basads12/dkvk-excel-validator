import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit/log";
import { requireUserApi } from "@/lib/auth/require-user";
import {
  extractColumnSchemaFromHeaders,
  getHeadersFromBuffer,
} from "@/lib/excel/parse";
import { sanitizeFilename, validateXlsxBuffer } from "@/lib/upload/limits";
import { isValidXlsxFile } from "@/lib/upload/limits";

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

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateXlsxBuffer(buffer)) {
      return NextResponse.json({ error: "Ongeldig Excel-bestand" }, { status: 400 });
    }

    const headers = await getHeadersFromBuffer(buffer);
    if (headers.length === 0) {
      return NextResponse.json(
        { error: "Template bevat geen kolomkoppen" },
        { status: 400 }
      );
    }

    const columnSchema = extractColumnSchemaFromHeaders(headers);
    const filename = sanitizeFilename(file.name);
    const storagePath = `${user.id}/${Date.now()}_${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("templates")
      .upload(storagePath, buffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    await supabase
      .from("templates")
      .update({ is_active: false })
      .eq("user_id", user.id);

    const { data: template, error: dbError } = await supabase
      .from("templates")
      .insert({
        user_id: user.id,
        name: filename,
        storage_path: storagePath,
        column_schema: columnSchema,
        is_active: true,
      })
      .select("id")
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    await logAudit(supabase, user.id, "template_upload", "template", template?.id);

    return NextResponse.json({ success: true, templateId: template?.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireUserApi();
    const { templateId } = await request.json();

    if (!templateId) {
      return NextResponse.json({ error: "Template ID vereist" }, { status: 400 });
    }

    await supabase
      .from("templates")
      .update({ is_active: false })
      .eq("user_id", user.id);

    const { error } = await supabase
      .from("templates")
      .update({ is_active: true })
      .eq("id", templateId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Actie mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
