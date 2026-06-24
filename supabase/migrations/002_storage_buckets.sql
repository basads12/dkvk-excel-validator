-- Storage buckets and policies

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('templates', 'templates', false, 5242880),
  ('uploads', 'uploads', false, 5242880),
  ('exports', 'exports', false, 10485760)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users manage own template files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users manage own upload files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users manage own export files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1]);
