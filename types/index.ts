export type UploadStatus =
  | "uploaded"
  | "processing"
  | "ready_for_review"
  | "exported"
  | "error";

export type RowStatus =
  | "valid"
  | "corrected"
  | "needs_review"
  | "missing_data"
  | "ambiguous"
  | "error";

export type CorrectionStatus =
  | "valid"
  | "corrected"
  | "needs_review"
  | "missing_data"
  | "ambiguous"
  | "error";

export type ColumnDataType =
  | "text"
  | "email"
  | "phone"
  | "postcode"
  | "number";

export interface ColumnSchema {
  name: string;
  required: boolean;
  dataType: ColumnDataType;
  order: number;
}

export interface TemplateColumnSchema {
  columns: ColumnSchema[];
}

export interface Profile {
  id: string;
  email: string;
  created_at: string;
}

export interface Template {
  id: string;
  user_id: string;
  name: string;
  storage_path: string;
  column_schema: TemplateColumnSchema;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Upload {
  id: string;
  user_id: string;
  template_id: string;
  status: UploadStatus;
  original_filename: string;
  storage_path: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  id: string;
  upload_id: string;
  filename: string;
  storage_path: string;
  file_size: number;
  created_at: string;
}

export interface ProcessingJob {
  id: string;
  upload_id: string;
  status: UploadStatus;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ProcessedRow {
  id: string;
  upload_id: string;
  row_index: number;
  row_data: Record<string, string>;
  status: RowStatus;
  created_at: string;
  updated_at: string;
}

export interface CellCorrection {
  id: string;
  processed_row_id: string;
  column_name: string;
  original_value: string | null;
  proposed_value: string | null;
  final_value: string | null;
  status: CorrectionStatus;
  confidence: number | null;
  source: string | null;
  reason: string | null;
  requires_approval: boolean;
  approved: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ParsedRow {
  rowIndex: number;
  values: Record<string, string>;
}

export interface ValidationIssue {
  column?: string;
  rowIndex?: number;
  status: CorrectionStatus;
  message: string;
  source: string;
}

export interface ProposedCorrection {
  column: string;
  rowIndex: number;
  originalValue: string;
  proposedValue: string;
  status: CorrectionStatus;
  confidence: number;
  source: string;
  reason: string;
  requiresApproval: boolean;
}

export const DEFAULT_COLUMN_HEADERS = [
  "Aanhef",
  "Naam",
  "Adres",
  "Nummer",
  "Postcode",
  "Woonplaats",
  "Email",
  "Tel/mobiel",
] as const;

export const DEFAULT_TEMPLATE_SCHEMA: TemplateColumnSchema = {
  columns: [
    { name: "Aanhef", required: false, dataType: "text", order: 0 },
    { name: "Naam", required: true, dataType: "text", order: 1 },
    { name: "Adres", required: true, dataType: "text", order: 2 },
    { name: "Nummer", required: true, dataType: "text", order: 3 },
    { name: "Postcode", required: true, dataType: "postcode", order: 4 },
    { name: "Woonplaats", required: true, dataType: "text", order: 5 },
    { name: "Email", required: false, dataType: "email", order: 6 },
    { name: "Tel/mobiel", required: false, dataType: "phone", order: 7 },
  ],
};

export const UPLOAD_STATUS_LABELS: Record<UploadStatus, string> = {
  uploaded: "Geüpload",
  processing: "Bezig met verwerken",
  ready_for_review: "Klaar voor controle",
  exported: "Geëxporteerd",
  error: "Foutmelding",
};

export const ROW_STATUS_LABELS: Record<RowStatus, string> = {
  valid: "Geldig",
  corrected: "Automatisch gecorrigeerd",
  needs_review: "Controle nodig",
  missing_data: "Ontbrekende gegevens",
  ambiguous: "Meerdere mogelijkheden",
  error: "Fout",
};
