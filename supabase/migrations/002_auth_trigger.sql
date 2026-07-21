-- ============================================================
-- Migration 002: Trigger de criação automática de perfil e assinatura
-- Executado automaticamente ao criar um novo usuário no Supabase Auth
-- ============================================================

-- Função chamada pelo trigger ao criar novo usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Cria perfil vazio para o novo usuário
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  -- Cria assinatura de trial (30 dias) para o novo usuário
  INSERT INTO public.subscriptions (user_id, status, trial_ends_at)
  VALUES (
    NEW.id,
    'trial',
    now() + interval '30 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger executado após inserção de novo usuário no Supabase Auth
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
