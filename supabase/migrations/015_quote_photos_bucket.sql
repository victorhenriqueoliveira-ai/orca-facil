-- Migration 015: Cria bucket quote-photos no storage

INSERT INTO storage.buckets (id, name, public) VALUES ('quote-photos', 'quote-photos', false)
  ON CONFLICT DO NOTHING;
