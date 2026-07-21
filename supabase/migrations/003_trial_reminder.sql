-- Migration 003: Adiciona coluna trial_reminder_sent_at na tabela subscriptions
-- Registra quando o e-mail de reengajamento de trial foi enviado para evitar duplicatas
ALTER TABLE subscriptions ADD COLUMN trial_reminder_sent_at timestamptz;
