-- Seed de desenvolvimento — dados fictícios para o usuário de teste
-- Usuário: 3e15fde3-a0b3-47b2-84f0-a33afc2128ed
-- Execute no SQL Editor do Supabase

DO $$
DECLARE
  v_user_id uuid := '3e15fde3-a0b3-47b2-84f0-a33afc2128ed';
BEGIN

-- ============================================================
-- CLIENTES
-- ============================================================

INSERT INTO customers (id, user_id, name, phone, email, address, notes) VALUES
  (gen_random_uuid(), v_user_id, 'Ana Paula Ferreira',    '(11) 99234-5678', 'ana.ferreira@gmail.com',    'Rua das Flores, 142 — Jardim Paulista, SP',   'Apartamento pequeno, prefere MDF branco'),
  (gen_random_uuid(), v_user_id, 'Roberto Souza',         '(11) 98765-4321', 'roberto.souza@hotmail.com', 'Av. Brasil, 890 — Centro, Guarulhos, SP',      'Obra em andamento, entrar em contato após 18h'),
  (gen_random_uuid(), v_user_id, 'Mariana Costa Lima',   '(21) 97654-3210', 'mariana.lima@yahoo.com.br', 'Rua Copacabana, 55 — Barra da Tijuca, RJ',    'Cozinha + closet, orçamento urgente'),
  (gen_random_uuid(), v_user_id, 'Carlos Eduardo Ramos', '(31) 96543-2109', 'carlos.ramos@empresa.com',  'Rua Contorno, 310 — Lourdes, BH, MG',         'Casa nova, planeja todos os cômodos'),
  (gen_random_uuid(), v_user_id, 'Fernanda Oliveira',    '(41) 95432-1098', 'feoliveira@outlook.com',    'Al. Dom Pedro II, 77 — Bigorrilho, Curitiba, PR', 'Indicação do Roberto Souza'),
  (gen_random_uuid(), v_user_id, 'João Batista Nunes',   '(51) 94321-0987', 'joao.nunes@gmail.com',      'Av. Ipiranga, 200 — Floresta, Porto Alegre, RS', NULL),
  (gen_random_uuid(), v_user_id, 'Patrícia Mendes',      '(19) 93210-9876', 'patricia.mendes@gmail.com', 'Rua XV de Novembro, 410 — Centro, Campinas, SP', 'Quer closet casal + quarto de criança'),
  (gen_random_uuid(), v_user_id, 'Lucas Alves Teixeira', '(11) 92109-8765', 'lucas.teixeira@uol.com.br', 'Rua Augusta, 1500 — Consolação, SP',          'Escritório home office — prazo 45 dias');

-- ============================================================
-- CATÁLOGO — MATERIAIS
-- ============================================================

INSERT INTO catalog_items (id, user_id, name, type, unit, unit_price, is_active) VALUES
  -- Painéis MDF
  (gen_random_uuid(), v_user_id, 'MDF Branco TX 15mm',         'material', 'm²',  89.90,  true),
  (gen_random_uuid(), v_user_id, 'MDF Branco TX 18mm',         'material', 'm²',  99.90,  true),
  (gen_random_uuid(), v_user_id, 'MDF Cinza Cimento 15mm',     'material', 'm²', 109.90,  true),
  (gen_random_uuid(), v_user_id, 'MDF Carvalho Naturale 18mm', 'material', 'm²', 119.90,  true),
  (gen_random_uuid(), v_user_id, 'MDF Preto TX 15mm',          'material', 'm²', 104.90,  true),
  (gen_random_uuid(), v_user_id, 'Compensado Naval 15mm',      'material', 'm²',  74.90,  true),
  (gen_random_uuid(), v_user_id, 'Fundo de gaveta 3mm',        'material', 'm²',  29.90,  true),
  -- Ferragens
  (gen_random_uuid(), v_user_id, 'Corrediça telescópica 45cm', 'material', 'par',  28.50,  true),
  (gen_random_uuid(), v_user_id, 'Corrediça telescópica 60cm', 'material', 'par',  34.90,  true),
  (gen_random_uuid(), v_user_id, 'Dobradiça caneco 35mm',      'material', 'un',    4.80,  true),
  (gen_random_uuid(), v_user_id, 'Puxador aço escovado 128mm', 'material', 'un',   18.90,  true),
  (gen_random_uuid(), v_user_id, 'Puxador perfil LED 60cm',    'material', 'un',   89.00,  true),
  (gen_random_uuid(), v_user_id, 'Parafuso MDF 3,5x30mm',      'material', 'cx',   22.00,  true),
  (gen_random_uuid(), v_user_id, 'Pé regulável 10cm',          'material', 'un',    6.50,  true),
  -- Acabamentos
  (gen_random_uuid(), v_user_id, 'Fita de borda branca 22mm',  'material', 'm',     1.20,  true),
  (gen_random_uuid(), v_user_id, 'Fita de borda carvalho 22mm','material', 'm',     1.80,  true),
  (gen_random_uuid(), v_user_id, 'Cola PVA extra',             'material', 'kg',   14.90,  true),
  -- Tampos e vidros
  (gen_random_uuid(), v_user_id, 'Tampo granito preto São Gabriel 3cm', 'material', 'm²', 380.00, true),
  (gen_random_uuid(), v_user_id, 'Tampo silestone branco 2cm',           'material', 'm²', 520.00, true),
  (gen_random_uuid(), v_user_id, 'Vidro temperado 6mm',                  'material', 'm²', 180.00, true);

-- ============================================================
-- CATÁLOGO — SERVIÇOS
-- ============================================================

INSERT INTO catalog_items (id, user_id, name, type, unit, unit_price, is_active) VALUES
  (gen_random_uuid(), v_user_id, 'Projeto e medição',              'service', 'vb',   350.00, true),
  (gen_random_uuid(), v_user_id, 'Corte e usinagem CNC',           'service', 'm²',    65.00, true),
  (gen_random_uuid(), v_user_id, 'Montagem e instalação',          'service', 'h',     85.00, true),
  (gen_random_uuid(), v_user_id, 'Instalação de ferragens',        'service', 'un',    12.00, true),
  (gen_random_uuid(), v_user_id, 'Acabamento e limpeza final',     'service', 'vb',   200.00, true),
  (gen_random_uuid(), v_user_id, 'Frete e transporte (SP capital)', 'service', 'vb',  180.00, true),
  (gen_random_uuid(), v_user_id, 'Demolição de móvel antigo',      'service', 'vb',   250.00, true),
  (gen_random_uuid(), v_user_id, 'Ajuste e nível em obra',         'service', 'h',     75.00, true);

END $$;
