-- Migration 012: Adiciona campos de configuração da Fase 2 em profiles

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS followup_days              int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS price_alert_days           int NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS sheet_waste_pct            numeric(4,2) NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS whatsapp_message_template  text;
