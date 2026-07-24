ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf_cnpj text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_cnpj_unique
  ON profiles (cpf_cnpj)
  WHERE cpf_cnpj IS NOT NULL;
