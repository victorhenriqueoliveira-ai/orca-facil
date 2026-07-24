-- Adiciona campo de imagem ao catálogo
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS image_url text;

-- Bucket para imagens do catálogo (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalog', 'catalog', false)
ON CONFLICT (id) DO NOTHING;

-- Política: usuário autenticado pode fazer upload na própria pasta
CREATE POLICY "catalog_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'catalog' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "catalog_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'catalog' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "catalog_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'catalog' AND (storage.foldername(name))[1] = auth.uid()::text);
