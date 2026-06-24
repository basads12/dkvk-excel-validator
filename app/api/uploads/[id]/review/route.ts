import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: uploadId } = await params;
    const { supabase, user } = await requireUserApi();
    const body = await request.json();
    const { action, correctionId, value } = body;

    const { data: upload } = await supabase
      .from("uploads")
      .select("id")
      .eq("id", uploadId)
      .eq("user_id", user.id)
      .single();

    if (!upload) {
      return NextResponse.json({ error: "Upload niet gevonden" }, { status: 404 });
    }

    const { data: correction } = await supabase
      .from("cell_corrections")
      .select("*, processed_rows!inner(upload_id)")
      .eq("id", correctionId)
      .single();

    if (!correction) {
      return NextResponse.json({ error: "Correctie niet gevonden" }, { status: 404 });
    }

    if (action === "approve") {
      await supabase
        .from("cell_corrections")
        .update({
          approved: true,
          final_value: correction.proposed_value,
        })
        .eq("id", correctionId);
    } else if (action === "reject") {
      await supabase
        .from("cell_corrections")
        .update({
          approved: false,
          final_value: correction.original_value,
        })
        .eq("id", correctionId);
    } else if (action === "update" && value !== undefined) {
      await supabase
        .from("cell_corrections")
        .update({
          approved: true,
          final_value: value,
          proposed_value: value,
        })
        .eq("id", correctionId);
    } else {
      return NextResponse.json({ error: "Ongeldige actie" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Actie mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
