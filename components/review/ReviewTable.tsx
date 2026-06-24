"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { RowStatusBadge } from "@/components/StatusBadge";
import type { CellCorrection, ProcessedRow, RowStatus, TemplateColumnSchema } from "@/types";

type FilterOption = "all" | RowStatus;

interface ReviewTableProps {
  uploadId: string;
  templateSchema: TemplateColumnSchema;
  rows: ProcessedRow[];
  corrections: CellCorrection[];
}

export default function ReviewTable({
  uploadId,
  templateSchema,
  rows,
  corrections,
}: ReviewTableProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterOption>("all");
  const [editing, setEditing] = useState<{ rowId: string; column: string } | null>(
    null
  );
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const columns = useMemo(
    () => [...templateSchema.columns].sort((a, b) => a.order - b.order),
    [templateSchema]
  );

  const correctionsByRow = useMemo(() => {
    const map = new Map<string, Map<string, CellCorrection>>();
    for (const c of corrections) {
      if (!map.has(c.processed_row_id)) {
        map.set(c.processed_row_id, new Map());
      }
      map.get(c.processed_row_id)!.set(c.column_name, c);
    }
    return map;
  }, [corrections]);

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const needsReviewCount = rows.filter(
    (r) => r.status === "needs_review" || r.status === "ambiguous"
  ).length;

  async function handleAction(
    action: "approve" | "reject" | "update",
    correctionId: string,
    value?: string
  ) {
    setLoading(correctionId);
    try {
      const res = await fetch(`/api/uploads/${uploadId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, correctionId, value }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Actie mislukt");
        return;
      }
      setEditing(null);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  function getCellDisplay(
    row: ProcessedRow,
    column: string
  ): { display: string; correction?: CellCorrection } {
    const rowCorrections = correctionsByRow.get(row.id);
    const correction = rowCorrections?.get(column);
    if (!correction) {
      return { display: row.row_data[column] ?? "" };
    }
    if (correction.final_value !== null && correction.final_value !== undefined) {
      return { display: correction.final_value, correction };
    }
    if (correction.approved === true && correction.proposed_value) {
      return { display: correction.proposed_value, correction };
    }
    if (correction.approved === false) {
      return {
        display: correction.original_value ?? row.row_data[column] ?? "",
        correction,
      };
    }
    return {
      display: correction.proposed_value ?? row.row_data[column] ?? "",
      correction,
    };
  }

  const filters: { value: FilterOption; label: string }[] = [
    { value: "all", label: "Alles" },
    { value: "valid", label: "Geldig" },
    { value: "corrected", label: "Automatisch gecorrigeerd" },
    { value: "needs_review", label: "Controle nodig" },
    { value: "error", label: "Fouten" },
  ];

  return (
    <div className="space-y-4">
      {needsReviewCount > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Let op: {needsReviewCount} rij(en) vereisen nog controle voordat u exporteert.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-sm ${
              filter === f.value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-600">#</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
              {columns.map((col) => (
                <th
                  key={col.name}
                  className="px-3 py-2 text-left font-medium text-slate-600"
                >
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredRows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="px-3 py-2 text-slate-500">{row.row_index + 1}</td>
                <td className="px-3 py-2">
                  <RowStatusBadge status={row.status} />
                </td>
                {columns.map((col) => {
                  const { display, correction } = getCellDisplay(row, col.name);
                  const isChanged =
                    correction &&
                    correction.proposed_value !== correction.original_value;
                  const isEditing =
                    editing?.rowId === row.id && editing?.column === col.name;

                  return (
                    <td key={col.name} className="px-3 py-2">
                      {isEditing && correction ? (
                        <div className="space-y-1">
                          <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full rounded border px-2 py-1 text-sm"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                handleAction("update", correction.id, editValue)
                              }
                              className="text-xs text-blue-600"
                            >
                              Opslaan
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="text-xs text-slate-500"
                            >
                              Annuleren
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {isChanged && correction?.original_value && (
                            <div className="text-xs text-slate-400 line-through">
                              Originele waarde: {correction.original_value}
                            </div>
                          )}
                          <div
                            className={
                              isChanged ? "font-medium text-blue-800" : "text-slate-900"
                            }
                          >
                            {display || "—"}
                          </div>
                          {correction?.proposed_value &&
                            correction.requires_approval &&
                            correction.approved === null && (
                              <div className="text-xs text-slate-500">
                                Nieuwe waarde: {correction.proposed_value}
                                {correction.source && ` · Bron: ${correction.source}`}
                              </div>
                            )}
                          {correction?.requires_approval &&
                            correction.approved === null && (
                              <div className="flex gap-1 pt-1">
                                <button
                                  disabled={loading === correction.id}
                                  onClick={() => handleAction("approve", correction.id)}
                                  className="rounded bg-green-600 px-2 py-0.5 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                  Goedkeuren
                                </button>
                                <button
                                  disabled={loading === correction.id}
                                  onClick={() => handleAction("reject", correction.id)}
                                  className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                                >
                                  Afwijzen
                                </button>
                                <button
                                  onClick={() => {
                                    setEditing({ rowId: row.id, column: col.name });
                                    setEditValue(display);
                                  }}
                                  className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200"
                                >
                                  Bewerken
                                </button>
                              </div>
                            )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
