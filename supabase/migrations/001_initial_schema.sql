-- DKVK Excel Validator — initial schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE upload_status AS ENUM (
  'uploaded',
  'processing',
  'ready_for_review',
  'exported',
  'error'
);

CREATE TYPE row_status AS ENUM (
  'valid',
  'corrected',
  'needs_review',
  'missing_data',
  'ambiguous',
  'error'
);

CREATE TYPE correction_status AS ENUM (
  'valid',
  'corrected',
  'needs_review',
  'missing_data',
  'ambiguous',
  'error'
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  column_schema JSONB NOT NULL DEFAULT '{"columns":[]}',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_user_active ON templates(user_id, is_active);

-- Uploads
CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
  status upload_status NOT NULL DEFAULT 'uploaded',
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_uploads_user ON uploads(user_id, created_at DESC);

-- Uploaded files (per upload batch)
CREATE TABLE uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Processing jobs
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  status upload_status NOT NULL DEFAULT 'processing',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Processed rows
CREATE TABLE processed_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  row_data JSONB NOT NULL DEFAULT '{}',
  status row_status NOT NULL DEFAULT 'valid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(upload_id, row_index)
);

CREATE INDEX idx_processed_rows_upload ON processed_rows(upload_id, row_index);

-- Cell corrections
CREATE TABLE cell_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processed_row_id UUID NOT NULL REFERENCES processed_rows(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  original_value TEXT,
  proposed_value TEXT,
  final_value TEXT,
  status correction_status NOT NULL DEFAULT 'valid',
  confidence NUMERIC(4, 3),
  source TEXT,
  reason TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  approved BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cell_corrections_row ON cell_corrections(processed_row_id);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER uploads_updated_at BEFORE UPDATE ON uploads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER processed_rows_updated_at BEFORE UPDATE ON processed_rows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER cell_corrections_updated_at BEFORE UPDATE ON cell_corrections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (auth.uid() = id);

-- Templates policies
CREATE POLICY templates_select_own ON templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY templates_insert_own ON templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY templates_update_own ON templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY templates_delete_own ON templates FOR DELETE USING (auth.uid() = user_id);

-- Uploads policies
CREATE POLICY uploads_select_own ON uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY uploads_insert_own ON uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY uploads_update_own ON uploads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY uploads_delete_own ON uploads FOR DELETE USING (auth.uid() = user_id);

-- Uploaded files (via upload ownership)
CREATE POLICY uploaded_files_select ON uploaded_files FOR SELECT
  USING (EXISTS (SELECT 1 FROM uploads u WHERE u.id = upload_id AND u.user_id = auth.uid()));
CREATE POLICY uploaded_files_insert ON uploaded_files FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM uploads u WHERE u.id = upload_id AND u.user_id = auth.uid()));
CREATE POLICY uploaded_files_delete ON uploaded_files FOR DELETE
  USING (EXISTS (SELECT 1 FROM uploads u WHERE u.id = upload_id AND u.user_id = auth.uid()));

-- Processing jobs
CREATE POLICY processing_jobs_select ON processing_jobs FOR SELECT
  USING (EXISTS (SELECT 1 FROM uploads u WHERE u.id = upload_id AND u.user_id = auth.uid()));
CREATE POLICY processing_jobs_insert ON processing_jobs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM uploads u WHERE u.id = upload_id AND u.user_id = auth.uid()));
CREATE POLICY processing_jobs_update ON processing_jobs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM uploads u WHERE u.id = upload_id AND u.user_id = auth.uid()));

-- Processed rows
CREATE POLICY processed_rows_select ON processed_rows FOR SELECT
  USING (EXISTS (SELECT 1 FROM uploads u WHERE u.id = upload_id AND u.user_id = auth.uid()));
CREATE POLICY processed_rows_insert ON processed_rows FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM uploads u WHERE u.id = upload_id AND u.user_id = auth.uid()));
CREATE POLICY processed_rows_update ON processed_rows FOR UPDATE
  USING (EXISTS (SELECT 1 FROM uploads u WHERE u.id = upload_id AND u.user_id = auth.uid()));
CREATE POLICY processed_rows_delete ON processed_rows FOR DELETE
  USING (EXISTS (SELECT 1 FROM uploads u WHERE u.id = upload_id AND u.user_id = auth.uid()));

-- Cell corrections
CREATE POLICY cell_corrections_select ON cell_corrections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM processed_rows pr
    JOIN uploads u ON u.id = pr.upload_id
    WHERE pr.id = processed_row_id AND u.user_id = auth.uid()
  ));
CREATE POLICY cell_corrections_insert ON cell_corrections FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM processed_rows pr
    JOIN uploads u ON u.id = pr.upload_id
    WHERE pr.id = processed_row_id AND u.user_id = auth.uid()
  ));
CREATE POLICY cell_corrections_update ON cell_corrections FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM processed_rows pr
    JOIN uploads u ON u.id = pr.upload_id
    WHERE pr.id = processed_row_id AND u.user_id = auth.uid()
  ));
CREATE POLICY cell_corrections_delete ON cell_corrections FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM processed_rows pr
    JOIN uploads u ON u.id = pr.upload_id
    WHERE pr.id = processed_row_id AND u.user_id = auth.uid()
  ));

-- Audit logs
CREATE POLICY audit_logs_select_own ON audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY audit_logs_insert_own ON audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Storage buckets (run in Supabase dashboard or via CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('templates', 'templates', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('exports', 'exports', false);

-- Storage policies (apply after buckets exist):
-- CREATE POLICY "Users can manage own template files"
--   ON storage.objects FOR ALL
--   USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1])
--   WITH CHECK (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can manage own upload files"
--   ON storage.objects FOR ALL
--   USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1])
--   WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can manage own export files"
--   ON storage.objects FOR ALL
--   USING (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1])
--   WITH CHECK (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1]);
