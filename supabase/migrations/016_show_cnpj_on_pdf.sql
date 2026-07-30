-- Permite ao marceneiro optar por exibir o CNPJ/CPF no PDF do orçamento
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_cnpj_on_pdf boolean NOT NULL DEFAULT false;
