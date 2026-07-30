<task>
Orça Fácil — Fase 2 e Diferenciais Competitivos
</task>

<goal>
Evoluir o Orça Fácil da Fase 1 (geração de PDF e envio pelo WhatsApp) para uma plataforma de fechamento de vendas, introduzindo aprovação digital pelo cliente via link público, follow-up automatizado, dashboard de conversão e um conjunto de funcionalidades que protegem o marceneiro de perda de receita (preços desatualizados, orçamentos vencendo) e reduzem o atrito no início do uso (catálogo pré-preenchido regional). O resultado esperado é aumentar a conversão de orçamentos enviados em aprovados, elevar a percepção de valor durante o trial e diferenciar o produto de concorrentes que entregam apenas PDF — sem nenhuma rastreabilidade da resposta do cliente.
</goal>

<requirements>
Negocio:

Link de aprovação digital pelo cliente:
- Ao gerar o orçamento (etapa 4 do wizard), o sistema cria automaticamente um link público com token único opaco (ex: /o/[token]) onde o cliente visualiza o orçamento sem precisar de cadastro.
- O cliente pode clicar em "Aprovar" ou "Tenho dúvidas" — a segunda opção abre o WhatsApp do marceneiro com mensagem pré-preenchida.
- Quando o cliente clica em "Aprovar", o status do orçamento muda automaticamente para "aprovado" no sistema.
- O marceneiro recebe notificação por e-mail (Resend) e alerta in-app na próxima abertura do produto.
- O link usa token opaco (UUIDv4) — acesso público sem exigir identificação do cliente.
- O link expira quando o prazo de validade do orçamento é atingido ou quando o orçamento é marcado como cancelado.
- A página pública exibe: logo da marcenaria, dados do orçamento, resumo de ambientes e valores, prazo de validade e dados de contato do marceneiro.
- Quando há múltiplas versões do orçamento, o link exibe a comparação entre versões.

Follow-up automático:
- O marceneiro configura um prazo de follow-up padrão nas configurações do perfil (opções: 3, 5 ou 7 dias após o envio).
- Quando o prazo chega e o orçamento ainda está em status "enviado", o sistema notifica o marceneiro por e-mail (Resend) e alerta in-app.
- O alerta traz acesso direto ao orçamento e ao contato do cliente.

Dashboard de conversão:
- Nova seção no produto com métricas do marceneiro: orçamentos enviados vs. aprovados por período, taxa de conversão (%), ticket médio dos orçamentos aprovados e valor total aprovado no mês.
- Filtro por período: último mês, últimos 3 meses, últimos 6 meses e personalizado.
- Dados exibidos apenas para orçamentos do próprio usuário (RLS).

Catálogo pré-preenchido por região no onboarding:
- Após o cadastro, o sistema pergunta o estado do marceneiro e oferece um catálogo base com materiais e serviços comuns de marcenaria com preços de referência regionais.
- O marceneiro pode importar o catálogo sugerido em lote ou selecionar itens individuais.
- Os itens importados entram como itens normais do catálogo do marceneiro, editáveis como qualquer outro.
- Os preços de referência são obtidos de fonte externa a definir na TechSpec; fallback para dados estáticos se a fonte estiver indisponível.
- O onboarding de catálogo pode ser ignorado ("Pular por agora") sem bloquear o primeiro orçamento.

Calculadora de chapas embutida:
- No wizard de orçamento (etapa de ambientes), ao adicionar um item de material com unidade m², o sistema calcula automaticamente a quantidade de chapas padrão (2750×1830mm) necessárias, considerando percentual de perda configurável (padrão 15%).
- Exibido como informação auxiliar abaixo do campo de quantidade — não substitui o valor inserido pelo marceneiro.
- O percentual de perda é configurável globalmente nas configurações do perfil.

Alerta de preços desatualizados no catálogo:
- Para cada item do catálogo, o sistema registra a data da última atualização de preço.
- Quando o prazo configurado (padrão 60 dias, opções: 30, 60 ou 90 dias) é atingido sem atualização e o item foi usado em orçamentos recentes, o sistema exibe alerta no catálogo e inline ao selecionar o item no wizard.
- Ação rápida "Atualizar preço" no alerta leva diretamente ao item no catálogo.

Fotos de referência no PDF:
- No wizard (etapa de ambientes), o marceneiro pode fazer upload de 1–3 fotos por ambiente (inspiração, foto do espaço ou projeto similar).
- As fotos aparecem no PDF somente no modo detalhado, dentro da seção do ambiente correspondente.
- Tamanho máximo por foto: 5MB. Formatos aceitos: JPG, PNG, WEBP.

Modelo de mensagem WhatsApp editável:
- Na etapa 4 do wizard (envio), ao invés de abrir o WhatsApp diretamente, o sistema exibe uma prévia da mensagem com campos pré-preenchidos: nome do cliente, número do orçamento, valor total e link de aprovação.
- O marceneiro pode editar a mensagem antes de enviar e salvar o modelo como padrão nas configurações do perfil.
- Ao confirmar, o WhatsApp é aberto com a mensagem pré-preenchida no corpo.

Notificação de orçamento prestes a vencer:
- 3 dias antes do prazo de validade de um orçamento em status "enviado", o sistema envia e-mail ao marceneiro (Resend) e exibe alerta in-app.
- O alerta traz ações rápidas: "Renovar validade" (modal para alterar a data) e "Marcar como cancelado".
- Ao renovar a validade, o link de aprovação anterior é invalidado e um novo link é gerado com a nova data.

Arquitetura:

- Toda a lógica de negócio permanece em Route Handlers (Next.js App Router) — sem nova camada de serviço.
- Link de aprovação: nova rota pública `/o/[token]` (Server Component) sem autenticação e sem cookie de sessão; token UUIDv4 armazenado na tabela `quotes`.
- Aprovação via POST `/api/quotes/[id]/approve`: valida token, atualiza status, dispara notificação por e-mail.
- Notificações de follow-up e vencimento: job agendado (pg_cron ou Supabase Edge Function com cron trigger) executado diariamente; dispara e-mails via Resend e registra alertas in-app.
- Dashboard de conversão: queries agregadas no Supabase Postgres via Route Handler com RLS do usuário autenticado.
- Catálogo pré-preenchido: integração com fonte externa de preços a definir na TechSpec; endpoint `/api/catalog/regional-suggestions?state=[UF]` para consulta e `/api/catalog/import-suggestions` para importação.
- Calculadora de chapas: lógica client-side pura, sem chamada de API.
- Alerta de preços: campo `price_updated_at` adicionado à tabela `catalog_items`; verificado no carregamento do catálogo e na seleção de itens no wizard.
- Fotos de orçamento: novo bucket `quote-photos/` no Supabase Storage (privado, URLs assinadas); referência armazenada em tabela auxiliar `quote_room_photos`.
- Configurações ampliadas na tabela `profiles`: `followup_days`, `price_alert_days`, `sheet_waste_pct`, `whatsapp_message_template`.
- Alertas in-app: tabela `notifications` por usuário com tipo, referência ao orçamento e status (lida/não lida).

UI/UX:

- Página pública `/o/[token]`: layout limpo, logo da marcenaria proeminente, resumo do orçamento, botão "Aprovar" em destaque e botão "Tenho dúvidas" (secundário, abre WhatsApp). Mobile-first. Exibe estado "já aprovado" se o cliente acessar novamente; exibe "orçamento vencido" se o link expirou.
- Alertas in-app: badge ou banner no header e na lista de orçamentos indicando aprovações recebidas, follow-up pendente e orçamentos vencendo. Clique direciona ao orçamento.
- Dashboard: nova entrada no menu de navegação (ex: "Desempenho"). Métricas em cards com período selecionável e gráfico simples de barras ou linha para conversão ao longo do tempo.
- Calculadora de chapas: texto auxiliar em cinza abaixo do campo de quantidade no wizard — "Estimativa: X chapas (considerando Y% de perda)". Não bloqueia o fluxo.
- Alerta de preço desatualizado: badge no item no catálogo e aviso inline ao selecionar o item no wizard, com ação rápida "Atualizar preço".
- Modelo de mensagem WhatsApp: modal na etapa 4 com campo de texto editável, prévia formatada e botão "Enviar pelo WhatsApp".
- Onboarding de catálogo regional: tela após o cadastro com lista de itens sugeridos por estado (checkbox por item), botão "Importar selecionados" e link "Pular por agora".
- Configurações: nova seção em "Configurações" para prazo de follow-up padrão, prazo de alerta de preços, percentual de perda de chapas e modelo de mensagem WhatsApp.
</requirements>

<api_contracts>
APIs de backend:

- `GET /o/[token]` — Página pública de aprovação (Server Component, sem autenticação). Retorna dados do orçamento associado ao token. Erros: 404 se token inválido ou expirado.
- `POST /api/quotes/[id]/approve` — Chamado pelo botão "Aprovar" na página pública. Body: `{ token: string }`. Valida token, atualiza status para "aprovado", dispara e-mail ao marceneiro. Resposta: 200 OK. Erros: 404 (token inválido), 409 (orçamento já aprovado ou expirado).
- `GET /api/dashboard/conversion` — Retorna métricas agregadas do usuário autenticado. Query params: `period` (1m|3m|6m|custom), `from`, `to`. Resposta: `{ sent, approved, conversion_rate, avg_ticket, total_approved }`.
- `GET /api/catalog/regional-suggestions?state=[UF]` — Retorna lista de itens sugeridos por estado. Fonte externa a definir na TechSpec. Erros: 400 (UF inválida), 503 (fonte externa indisponível, retorna fallback estático).
- `POST /api/catalog/import-suggestions` — Importa itens selecionados para o catálogo do marceneiro autenticado. Body: `{ items: CatalogItem[] }`. Resposta: 201 com itens criados.
</api_contracts>

<acceptance_criteria>

- Dado que o marceneiro gerou um orçamento, quando acessar a etapa 4 (envio), então o sistema exibe o link de aprovação copiável e a prévia da mensagem WhatsApp pré-preenchida com o link.
- Dado que o cliente acessa o link de aprovação público, quando clicar em "Aprovar", então o status do orçamento muda para "aprovado", o marceneiro recebe e-mail de notificação e alerta in-app é criado.
- Dado que o link de aprovação é acessado após o prazo de validade do orçamento, quando o cliente tentar aprovar, então o sistema exibe mensagem de link expirado sem alterar o status.
- Dado que o marceneiro configurou follow-up para 5 dias e enviou um orçamento, quando 5 dias passarem sem aprovação, então o sistema envia e-mail de follow-up e exibe alerta in-app.
- Dado que o marceneiro acessa o dashboard de conversão e seleciona um período, então o sistema exibe total de orçamentos enviados, aprovados, taxa de conversão (%) e ticket médio.
- Dado que um marceneiro acaba de se cadastrar e informa seu estado, quando chegar na etapa de catálogo no onboarding, então o sistema exibe itens sugeridos para aquele estado com opção de importar em lote ou pular.
- Dado que o marceneiro adiciona um item de MDF (unidade m²) no wizard e informa a quantidade, então o sistema exibe abaixo do campo a estimativa de chapas necessárias com o percentual de perda configurado.
- Dado que um item do catálogo não tem preço atualizado há mais do que o prazo configurado, quando o marceneiro acessar o catálogo ou selecionar o item no wizard, então o sistema exibe alerta de preço desatualizado com ação rápida para atualizar.
- Dado que o marceneiro adiciona fotos a um ambiente no wizard, quando gerar o PDF no modo detalhado, então as fotos aparecem no PDF dentro da seção do ambiente correspondente.
- Dado que um orçamento em status "enviado" está a 3 dias de vencer, quando o job diário executar, então o marceneiro recebe e-mail de aviso e alerta in-app com ações para renovar validade ou cancelar.
- Dado que o marceneiro renova a validade de um orçamento, quando confirmar a nova data, então o link de aprovação anterior é invalidado e um novo link é gerado com a nova validade.
</acceptance_criteria>

<constraints>
- FAÇA: manter RLS ativado em todas as tabelas novas — dados de aprovação, notificações e fotos isolados por user_id.
- FAÇA: gerar o token do link de aprovação como UUIDv4 opaco, sem expor quote_id ou qualquer dado interno na URL.
- FAÇA: expirar automaticamente o link de aprovação quando o orçamento vencer ou for cancelado.
- FAÇA: armazenar fotos de orçamento no Supabase Storage com acesso privado e URLs assinadas.
- FAÇA: validar tamanho máximo (5MB) e formato (JPG, PNG, WEBP) no upload de fotos.
- FAÇA: implementar a calculadora de chapas como lógica client-side pura, sem chamada de API.
- FAÇA: usar pg_cron ou Supabase Edge Function com cron trigger para o job diário de notificações.
- FAÇA: tratar indisponibilidade da fonte externa de preços com fallback para dados estáticos no onboarding de catálogo.
- NÃO FAÇA: exigir cadastro, login ou qualquer identificação do cliente na página de aprovação.
- NÃO FAÇA: substituir o fluxo de PDF existente — o link de aprovação é complementar ao PDF.
- NÃO FAÇA: adicionar controle financeiro, estoque, multi-usuário, integração 3D ou plano de corte CNC.
- NUNCA: expor dados de um marceneiro no link público de aprovação de outro marceneiro.
- NUNCA: alterar o status de um orçamento via link de aprovação se ele já estiver expirado ou cancelado.
</constraints>
