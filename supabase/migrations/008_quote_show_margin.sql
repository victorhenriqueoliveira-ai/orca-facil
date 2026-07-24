-- Adiciona opção de exibir ou ocultar margem de lucro no PDF
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS show_margin_on_pdf boolean NOT NULL DEFAULT true;
