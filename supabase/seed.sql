-- ============================================================
-- Seed: Templates de ambiente do sistema
-- 6 ambientes com ao menos 4 itens padrão cada
-- Conforme ADR-004: templates armazenados no Postgres via seed
-- NOTA: os itens NÃO têm unit_price (o marceneiro preenche ao usar)
-- ============================================================

-- ============================================================
-- 1. COZINHA
-- ============================================================
WITH t AS (
  INSERT INTO system_templates (room_type, name)
  VALUES ('cozinha', 'Cozinha')
  RETURNING id
)
INSERT INTO system_template_items (template_id, name, type, unit, default_quantity, sort_order)
SELECT
  t.id,
  item.name,
  item.type,
  item.unit,
  item.default_quantity,
  item.sort_order
FROM t, (VALUES
  ('MDF 15mm (porta de armário)', 'material', 'm²', 8.00, 1),
  ('MDF 18mm (prateleira)', 'material', 'm²', 4.00, 2),
  ('Corrediça telescópica', 'material', 'peça', 6.00, 3),
  ('Dobradiça com amortecedor', 'material', 'peça', 12.00, 4),
  ('Puxador de alumínio', 'material', 'peça', 8.00, 5),
  ('Instalação e montagem', 'service', 'projeto', 1.00, 6)
) AS item(name, type, unit, default_quantity, sort_order);

-- ============================================================
-- 2. QUARTO (ROUPEIRO)
-- ============================================================
WITH t AS (
  INSERT INTO system_templates (room_type, name)
  VALUES ('quarto', 'Quarto (Roupeiro)')
  RETURNING id
)
INSERT INTO system_template_items (template_id, name, type, unit, default_quantity, sort_order)
SELECT
  t.id,
  item.name,
  item.type,
  item.unit,
  item.default_quantity,
  item.sort_order
FROM t, (VALUES
  ('MDF 18mm (estrutura)', 'material', 'm²', 10.00, 1),
  ('MDF 15mm (prateleira)', 'material', 'm²', 6.00, 2),
  ('Porta de correr (trilho)', 'material', 'peça', 2.00, 3),
  ('Cabide retráctil', 'material', 'peça', 2.00, 4),
  ('Espelho (porta)', 'material', 'm²', 1.80, 5),
  ('Instalação e montagem', 'service', 'projeto', 1.00, 6)
) AS item(name, type, unit, default_quantity, sort_order);

-- ============================================================
-- 3. SALA
-- ============================================================
WITH t AS (
  INSERT INTO system_templates (room_type, name)
  VALUES ('sala', 'Sala')
  RETURNING id
)
INSERT INTO system_template_items (template_id, name, type, unit, default_quantity, sort_order)
SELECT
  t.id,
  item.name,
  item.type,
  item.unit,
  item.default_quantity,
  item.sort_order
FROM t, (VALUES
  ('MDF 18mm (painel TV)', 'material', 'm²', 3.00, 1),
  ('MDF 15mm (nicho/prateleira)', 'material', 'm²', 2.00, 2),
  ('Suporte de parede para TV', 'material', 'peça', 1.00, 3),
  ('Iluminação embutida (fita LED)', 'material', 'm_linear', 5.00, 4),
  ('Acabamento em laca', 'service', 'm²', 3.00, 5),
  ('Instalação e montagem', 'service', 'projeto', 1.00, 6)
) AS item(name, type, unit, default_quantity, sort_order);

-- ============================================================
-- 4. ESCRITÓRIO
-- ============================================================
WITH t AS (
  INSERT INTO system_templates (room_type, name)
  VALUES ('escritorio', 'Escritório')
  RETURNING id
)
INSERT INTO system_template_items (template_id, name, type, unit, default_quantity, sort_order)
SELECT
  t.id,
  item.name,
  item.type,
  item.unit,
  item.default_quantity,
  item.sort_order
FROM t, (VALUES
  ('MDF 25mm (tampo de mesa)', 'material', 'm²', 1.50, 1),
  ('MDF 18mm (estrutura)', 'material', 'm²', 3.00, 2),
  ('Prateleira flutuante', 'material', 'm_linear', 2.00, 3),
  ('Pé de ferro (mesa)', 'material', 'peça', 4.00, 4),
  ('Acabamento bordas (fita PVC)', 'material', 'm_linear', 8.00, 5),
  ('Instalação e montagem', 'service', 'projeto', 1.00, 6)
) AS item(name, type, unit, default_quantity, sort_order);

-- ============================================================
-- 5. BANHEIRO
-- ============================================================
WITH t AS (
  INSERT INTO system_templates (room_type, name)
  VALUES ('banheiro', 'Banheiro')
  RETURNING id
)
INSERT INTO system_template_items (template_id, name, type, unit, default_quantity, sort_order)
SELECT
  t.id,
  item.name,
  item.type,
  item.unit,
  item.default_quantity,
  item.sort_order
FROM t, (VALUES
  ('MDF hidrófugo 15mm (gabinete)', 'material', 'm²', 1.50, 1),
  ('Espelho bisotado', 'material', 'm²', 0.80, 2),
  ('Dobradiça inox', 'material', 'peça', 4.00, 3),
  ('Puxador inox', 'material', 'peça', 2.00, 4),
  ('Nicho de embutir', 'material', 'peça', 1.00, 5),
  ('Instalação e montagem', 'service', 'projeto', 1.00, 6)
) AS item(name, type, unit, default_quantity, sort_order);

-- ============================================================
-- 6. ÁREA DE SERVIÇO
-- ============================================================
WITH t AS (
  INSERT INTO system_templates (room_type, name)
  VALUES ('area_de_servico', 'Área de Serviço')
  RETURNING id
)
INSERT INTO system_template_items (template_id, name, type, unit, default_quantity, sort_order)
SELECT
  t.id,
  item.name,
  item.type,
  item.unit,
  item.default_quantity,
  item.sort_order
FROM t, (VALUES
  ('MDF hidrófugo 18mm (armário)', 'material', 'm²', 4.00, 1),
  ('Prateleira regulável', 'material', 'm_linear', 2.00, 2),
  ('Dobradiça com amortecedor', 'material', 'peça', 6.00, 3),
  ('Puxador plástico resistente', 'material', 'peça', 4.00, 4),
  ('Painel lavanderia (cabideiro/tábua)', 'material', 'peça', 1.00, 5),
  ('Instalação e montagem', 'service', 'projeto', 1.00, 6)
) AS item(name, type, unit, default_quantity, sort_order);
