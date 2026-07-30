-- Migration 014: Cria tabela quote_room_photos com RLS

CREATE TABLE IF NOT EXISTS quote_room_photos (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   uuid NOT NULL REFERENCES quote_rooms(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  position  int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS quote_room_photos_room_idx ON quote_room_photos(room_id);

ALTER TABLE quote_room_photos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quote_room_photos'
      AND policyname = 'own_room_photos'
  ) THEN
    CREATE POLICY "own_room_photos" ON quote_room_photos
      USING (
        EXISTS (
          SELECT 1 FROM quote_rooms qr
          JOIN quote_versions qv ON qv.id = qr.version_id
          JOIN quotes q ON q.id = qv.quote_id
          WHERE qr.id = room_id AND q.user_id = auth.uid()
        )
      );
  END IF;
END
$$;
