import { createClient } from "@supabase/supabase-js";

/**
 * Cria um cliente Supabase com a service_role key.
 * Use apenas em Route Handlers e server-side code onde não há contexto de usuário.
 * NUNCA exponha a service_role key no cliente.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
