-- Snapshot da imagem do item do catálogo no momento da adição ao orçamento
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS image_url text;
