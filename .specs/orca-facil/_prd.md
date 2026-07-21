# PRD — Orça Fácil

**Versão:** 1.0  
**Data:** 2026-07-20  
**Status:** Aprovado

---

## Visão Geral

Orça Fácil é um SaaS mobile-first para marceneiros autônomos e pequenas marcenarias (até 5 pessoas) no Brasil. O marceneiro preenche medidas e seleciona materiais e serviços, e o sistema gera instantaneamente um orçamento profissional em PDF com a logo dele, pronto para enviar pelo WhatsApp.

O problema central: marceneiros fazem orçamentos no papel, Excel ou WhatsApp, demoram dias para responder e perdem vendas para quem responde mais rápido. Um orçamento profissional entregue na hora da visita técnica aumenta diretamente a taxa de fechamento.

Posicionamento de mercado: concorrentes como Calcme (R$ 299/mês) e Promob (licença anual ~R$ 3–6k) atendem marcenarias médias com complexidade 3D. Orça Fácil entra no segmento desatendido — o marceneiro autônomo que ainda usa papel ou Excel — com preço ~4x menor e UX radicalmente mais simples.

---

## Objetivos

- **Ativação**: ≥ 70% dos novos cadastros enviam o primeiro PDF pelo WhatsApp em até 24h do cadastro.
- **Conversão trial→pago**: ≥ 25% ao final dos 30 dias de trial.
- **Retenção**: churn mensal < 5% na base pagante.
- **Tempo até primeiro orçamento**: mediana < 10 minutos do cadastro ao PDF enviado.
- **Engajamento**: ≥ 4 orçamentos gerados por usuário ativo/mês.
- **NPS**: ≥ 50 nos primeiros 6 meses de operação.

---

## Histórias de Usuário

### Persona principal: Marceneiro autônomo

- Como marceneiro, quero criar um orçamento pelo celular durante a visita técnica para enviar ao cliente antes de sair da casa dele.
- Como marceneiro, quero minha logo e dados no PDF para passar credibilidade e profissionalismo ao cliente.
- Como marceneiro, quero selecionar ambientes a partir de templates (cozinha, quarto, sala) para não precisar lembrar de todos os materiais de cabeça.
- Como marceneiro, quero manter meu catálogo de materiais e serviços com preços para não digitar os mesmos itens a cada orçamento.
- Como marceneiro, quero criar uma versão econômica e uma versão premium do mesmo orçamento para dar opção ao cliente e fechar mais rápido.
- Como marceneiro, quero ver todo o histórico de orçamentos de um cliente para saber o que já ofereci e em que valor.
- Como marceneiro, quero assinar pelo Pix em segundos para não precisar cadastrar cartão.

### Persona secundária: Dono de pequena marcenaria (2–5 pessoas)

- Como dono de marcenaria, quero que todos os orçamentos saiam com o visual da empresa para padronizar a comunicação com clientes.
- Como dono de marcenaria, quero consultar orçamentos anteriores por cliente para dar continuidade ao relacionamento comercial.

---

## Features Principais

### 1. Onboarding e Perfil da Marcenaria

O cadastro deve levar menos de 2 minutos e não bloquear o primeiro orçamento.

- Cadastro via e-mail ou número de telefone (WhatsApp).
- Perfil da marcenaria: nome, logo (upload de imagem), cidade, telefone, chave Pix ou dados bancários (exibidos no rodapé do PDF).
- Logo e dados complementares podem ser adicionados depois do primeiro acesso — não são obrigatórios para criar o primeiro orçamento.
- Trial de 30 dias com acesso completo ativado automaticamente no cadastro, sem exigir cartão.

### 2. Catálogo Próprio

Permite que o marceneiro configure uma vez seus preços e reutilize em todos os orçamentos.

- Cadastro de materiais: nome, unidade de medida (m², m linear, peça, folha) e preço unitário.
- Cadastro de serviços: nome, unidade (hora, projeto, verba) e preço unitário.
- Edição e inativação de itens (sem exclusão permanente para preservar histórico de orçamentos).
- O catálogo é opcional — o marceneiro pode criar orçamentos usando apenas templates sem cadastrar itens próprios.

### 3. Templates por Ambiente

Permite criar orçamentos rapidamente sem configurar nada previamente.

- Templates pré-definidos pelo sistema para os principais ambientes: cozinha, quarto (roupeiro), sala, escritório, banheiro, área de serviço.
- Cada template contém uma lista padrão de materiais e serviços com quantidades editáveis.
- Dentro de um ambiente baseado em template, o marceneiro pode ajustar quantidades, substituir itens ou adicionar itens do catálogo próprio.
- O marceneiro pode criar ambientes completamente avulsos (sem template) usando só o catálogo.

### 4. Criação de Orçamento — Wizard em 4 Etapas

Fluxo único e guiado, otimizado para mobile:

1. **Cliente** — selecionar cliente existente (busca por nome ou telefone) ou cadastrar novo na hora (nome, telefone, endereço da obra).
2. **Ambientes** — adicionar um ou mais ambientes via template ou itens avulsos; ajustar medidas, quantidades e preços em cada ambiente.
3. **Revisão** — visualizar total por ambiente, total geral e margem de lucro aplicada (percentual configurável); editar qualquer item antes de fechar.
4. **Envio** — gerar PDF e abrir WhatsApp com o arquivo pronto para enviar ao cliente.

Em qualquer etapa, o orçamento é salvo automaticamente como rascunho.

### 5. Múltiplas Versões de Orçamento

Permite oferecer opções ao cliente no mesmo PDF.

- O marceneiro cria variantes de um mesmo orçamento (ex.: "Padrão MDF 15mm" e "Premium MDF 18mm + ferragens importadas").
- Cada variante tem seus próprios ambientes e itens, com total independente.
- O PDF gerado pode incluir uma ou mais variantes; quando há mais de uma, exibe tabela comparativa com diferença de valor destacada.
- O marceneiro escolhe quais variantes incluir antes de gerar o PDF.

### 6. Geração de PDF Profissional

O PDF é gerado no servidor e tem visual consistente em qualquer dispositivo.

- Cabeçalho: logo da marcenaria, nome, telefone e cidade.
- Dados do cliente: nome, endereço da obra.
- Número sequencial do orçamento, data de emissão e prazo de validade (padrão 30 dias, configurável).
- **Modo resumido** (padrão): lista de ambientes com valor por ambiente e total geral — visual limpo para o cliente.
- **Modo detalhado** (ativável pelo marceneiro antes de gerar): item a item com quantidade, dimensões, preço unitário e subtotal.
- Quando há múltiplas variantes: tabela comparativa no topo seguida do detalhamento de cada variante.
- Rodapé: dados de pagamento da marcenaria (chave Pix, banco) e observações opcionais.

### 7. Módulo de Clientes

Elimina o retrabalho de redigitar dados de clientes recorrentes.

- Cadastro de clientes: nome, telefone (WhatsApp), endereço, e-mail (opcional), observações.
- Histórico de orçamentos por cliente com status e valores.
- Status de orçamento atualizado manualmente pelo marceneiro: rascunho, enviado, aprovado, cancelado.
- Busca rápida ao iniciar novo orçamento — dados do cliente preenchidos automaticamente.

### 8. Gestão de Orçamentos

- Lista de orçamentos com filtros por status (rascunho/enviado/aprovado/cancelado) e período.
- Duplicar orçamento existente como base para um novo (mesmo cliente, mesmos ambientes — editar o que mudar).
- Editar orçamentos em status rascunho.
- Visualizar e baixar o PDF de orçamentos já enviados.

### 9. Assinatura e Cobrança

- **Trial**: 30 dias com acesso completo, sem cartão, sem interrupção.
- **Pós-trial sem assinatura**: modo read-only — o marceneiro visualiza orçamentos criados mas não cria novos nem gera PDFs.
- **Checkout**: AbacatePay com Pix (confirmação imediata) e cartão de crédito.
- **Reativação**: acesso completo restaurado automaticamente após confirmação do pagamento.
- **Cancelamento**: feito pelo próprio usuário dentro do produto, sem necessidade de falar com suporte.
- E-mail de reengajamento enviado 3 dias antes do trial expirar, com lembrete do valor gerado (quantos orçamentos criou, quanto tempo economizou).

---

## Experiência do Usuário

### Jornada de ativação — objetivo: primeiro PDF enviado em menos de 10 minutos

1. Marceneiro acessa o link (mobile) e se cadastra com telefone ou e-mail.
2. Sistema pede: nome da marcenaria + upload de logo. Ambos têm opção "pular por agora".
3. Tela inicial mostra um único botão em destaque: **"Criar orçamento"**.
4. Wizard guia passo a passo: cliente → ambientes → revisão → enviar pelo WhatsApp.
5. No passo de ambientes, o sistema sugere templates para começar rápido.
6. PDF gerado abre o WhatsApp com o arquivo anexado, pronto para enviar.

### Princípios de UX

- **Uma ação principal por tela** — sem menu lateral complexo ou múltiplas opções no mesmo nível.
- **Campos mínimos obrigatórios** — apenas nome do cliente e pelo menos um item para gerar o PDF. Todo o resto é opcional ou progressivo.
- **Botões grandes, touch-friendly** — toda interação deve funcionar com polegar, sem precisar de precisão.
- **Feedback imediato** — loading visível ao gerar PDF, confirmação de sucesso, mensagem de erro acionável.
- **Onboarding progressivo** — logo, catálogo e múltiplas variantes são descobertos conforme o usuário avança, não empurrados no cadastro.
- **Sem jargão técnico** — linguagem do marceneiro: "ambiente", "item", "valor", não "linha de produto", "SKU" ou "proposta comercial".

---

## Restrições Técnicas de Alto Nível

- Funciona plenamente como web app em smartphones Android e iOS sem instalação de app.
- Geração de PDF ocorre no servidor para garantir consistência visual independente do dispositivo e navegador do usuário.
- Pagamento via AbacatePay (Pix e cartão) com webhooks para ativação e bloqueio automático de conta — sem intervenção manual.
- Logos e PDFs gerados armazenados em serviço de storage com URL de acesso controlado.
- Deploy contínuo sem janela de manutenção — o marceneiro pode criar orçamentos a qualquer hora.

---

## Não-Objetivos (Fora de Escopo)

As features abaixo não serão desenvolvidas nesta versão:

- Controle financeiro, fluxo de caixa ou DRE da marcenaria.
- Controle de estoque de materiais.
- Múltiplos usuários por conta (colaboração em equipe).
- Aplicativo nativo para iOS ou Android.
- Integração com Promob, AutoCAD ou qualquer software de projeto 3D.
- Importação automática de nota fiscal para atualização de preços de insumos.
- Plano de corte ou otimização de chapas (CNC).
- Renderização ou visualização 3D de móveis no orçamento.
- Gestão de produção, cronograma de obra ou ordem de serviço.
- Relatórios gerenciais, dashboards de conversão ou análise de desempenho.
- Notificações automáticas de follow-up ao cliente.
- Link de pagamento para o cliente pagar diretamente pelo orçamento.

---

## Plano de Lançamento em Fases

### Fase 1 — Produto completo (este PRD)

Todas as features descritas acima: onboarding, catálogo, templates, wizard de orçamento, múltiplas versões, PDF profissional, módulo de clientes, gestão de orçamentos e assinatura via AbacatePay.

**Critérios para avançar à Fase 2:**
- 50 usuários pagantes ativos.
- Churn mensal < 8%.
- NPS ≥ 40.
- Nenhum bug crítico em produção há 30 dias.

### Fase 2 — Crescimento e retenção

- Notificações de follow-up: lembrete automático para o marceneiro retornar ao cliente X dias após envio do orçamento.
- Integração WhatsApp Business API para envio direto (sem abrir o app manualmente).
- Dashboard de conversão: quantos orçamentos foram aprovados vs. enviados por período.
- Modelos de mensagem personalizáveis para acompanhamento do orçamento.

**Critérios para avançar à Fase 3:**
- 200 usuários pagantes ativos.
- Churn mensal < 5%.

### Fase 3 — Expansão

- Multi-usuário por conta (até 5 pessoas por marcenaria).
- Aplicativo nativo (iOS e Android).
- Link de pagamento junto ao orçamento (o cliente aprova e paga pelo link).
- Plano de corte básico gerado a partir dos itens do orçamento.

**Critério de longo prazo:** 500 usuários pagantes, receita recorrente mensal sustentável.

---

## Métricas de Sucesso

| Métrica | Meta |
|---|---|
| Usuários que enviam 1º PDF em até 24h | ≥ 70% dos cadastros |
| Conversão trial → pago | ≥ 25% |
| Churn mensal (base pagante) | < 5% |
| Tempo mediano do cadastro ao 1º PDF | < 10 minutos |
| Orçamentos gerados por usuário ativo/mês | ≥ 4 |
| NPS (6 meses) | ≥ 50 |

---

## Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| WoodOrca+ copia o posicionamento de preço baixo | Construir relacionamento direto via WhatsApp; preço sozinho não retém — experiência e suporte sim. |
| Marceneiro abandona no onboarding por dificuldade de cadastrar catálogo | Primeiro orçamento funciona sem catálogo, só com templates. Catálogo é configuração progressiva. |
| AbacatePay com falhas de processamento | Oferecer Pix e cartão; suporte via WhatsApp para desbloqueio manual em casos excepcionais. |
| Desenvolvedor solo: scope creep pós-lançamento | Backlog congelado até 50 pagantes. Toda nova feature exige remoção de outra de menor impacto. |
| Usuário não percebe valor do read-only e abandona | E-mail de reengajamento 3 dias antes do trial expirar, com resumo do que criou e case de outro marceneiro. |
| Templates pré-definidos com dados incorretos ou desatualizados | Validar templates com 5 marceneiros reais antes do lançamento; disponibilizar edição total de cada item do template. |

---

## Architecture Decision Records

- [ADR-001: Escopo Completo (A+B+C) em vez de MVP Mínimo](adrs/adr-001.md) — Decisão de incluir módulo de clientes e versões múltiplas de orçamento desde o lançamento para maximizar valor percebido na primeira versão pública.

---

## Questões em Aberto

- **Preço final**: R$ 49/mês ou R$ 79/mês? Ou dois planos com limites diferentes (ex.: Básico x Pro)? Impacta diretamente o posicionamento vs. concorrentes e a meta de conversão.
- **Fotos no PDF**: o marceneiro pode incluir fotos de referência (inspiração do ambiente) no orçamento? Não discutido — candidato à Fase 2.
- **Validação de templates**: quem valida e mantém a lista de materiais padrão por ambiente antes do lançamento? Requer sessão de teste com marceneiros reais.
- **Margem de lucro**: a margem é um percentual global ou configurável por ambiente/item? Decisão de produto com impacto direto na UX do wizard.


## Stack Técnica (Decidida)

Esta stack é definitiva para a Fase 1. Não sugerir nem substituir por alternativas durante a implementação.

### Frontend e Backend
- **Next.js (App Router) + TypeScript** — aplicação única, mobile-first, deploy na Vercel.
- **Tailwind CSS** — estilização, com foco em componentes touch-friendly.

### Banco de Dados e Infraestrutura
- **Supabase** como plataforma única de backend:
  - **Postgres** — banco de dados principal (clientes, orçamentos, catálogo, templates, assinaturas).
  - **Supabase Auth** — autenticação por e-mail e telefone (OTP via WhatsApp/SMS). Sem senha complexa: o público-alvo prefere código de verificação.
  - **Supabase Storage** — armazenamento de logos das marcenarias e PDFs gerados, com buckets privados e URLs assinadas (acesso controlado, conforme restrição técnica).
  - **Row Level Security (RLS)** ativado em todas as tabelas — cada marcenaria acessa apenas os próprios dados.

### Geração de PDF
- Geração **server-side** (Route Handler no Next.js) para garantir visual consistente.
- PDF salvo no Supabase Storage após geração; usuário recebe URL assinada para download/compartilhamento.

### Pagamentos
- **AbacatePay** — checkout de assinatura com Pix (confirmação imediata) e cartão.
- **Webhooks** do AbacatePay processados em Route Handler, com atualização automática do status da assinatura no Postgres (ativação, bloqueio read-only pós-trial, reativação).

### Deploy e Ambiente
- **Vercel** — deploy contínuo a partir da branch principal.
- Variáveis de ambiente para chaves do Supabase e AbacatePay (nunca commitadas).
- Ambiente único de produção na Fase 1; ambiente de staging é não-objetivo até a Fase 2.