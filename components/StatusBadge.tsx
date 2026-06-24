import type { RowStatus, UploadStatus } from "@/types";
import { ROW_STATUS_LABELS, UPLOAD_STATUS_LABELS } from "@/types";

const UPLOAD_COLORS: Record<UploadStatus, string> = {
  uploaded: "bg-slate-100 text-slate-700",
  processing: "bg-blue-100 text-blue-800",
  ready_for_review: "bg-amber-100 text-amber-900",
  exported: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
};

const ROW_COLORS: Record<RowStatus, string> = {
  valid: "bg-green-100 text-green-800",
  corrected: "bg-blue-100 text-blue-800",
  needs_review: "bg-amber-100 text-amber-900",
  missing_data: "bg-orange-100 text-orange-900",
  ambiguous: "bg-purple-100 text-purple-900",
  error: "bg-red-100 text-red-800",
};

export function UploadStatusBadge({ status }: { status: UploadStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${UPLOAD_COLORS[status]}`}
    >
      {UPLOAD_STATUS_LABELS[status]}
    </span>
  );
}

export function RowStatusBadge({ status }: { status: RowStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ROW_COLORS[status]}`}
    >
      {ROW_STATUS_LABELS[status]}
    </span>
  );
}
