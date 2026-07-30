# PRD — Orça Fácil Fase 2: Plataforma de Fechamento de Vendas

**Versão:** 1.0  
**Data:** 2026-07-25  
**Status:** Rascunho

---

## Visão Geral

A Fase 1 do Orça Fácil transformou o marceneiro autônomo de "papel e Excel" em "PDF profissional enviado pelo WhatsApp". A Fase 2 resolve o problema seguinte: o PDF foi enviado, e agora? O marceneiro não sabe se o cliente abriu, não sabe por que sumiu, e fica sem instrumentos para fechar a venda.

Esta fase transforma o Orça Fácil de um gerador de PDF em uma **plataforma de fechamento de vendas** — com rastreabilidade de aprovação, follow-up automatizado, proteção de margem e instrumentos de melhoria contínua. O cliente recebe um link interativo (não apenas um arquivo), o marceneiro é notificado quando há movimento, e o produto passa a gerar dados sobre conversão.

O público-alvo permanece o mesmo: marceneiro autônomo e pequenas marcenarias (até 5 pessoas) no Brasil. Todas as 9 features desta fase ficam disponíveis durante o trial de 30 dias, na mesma lógica da Fase 1.

---

## Objetivos

- **Conversão de orçamentos**: aumentar a taxa de orçamentos enviados que chegam a "aprovado" em ≥ 20 pontos percentuais nos primeiros 3 meses após lançamento da Fase 2.
- **Ativação mais rápida**: reduzir o tempo mediano do cadastro ao primeiro orçamento completo de < 10 minutos para < 7 minutos, por meio do catálogo pré-preenchido regional.
- **Retenção de pagantes**: reduzir o churn mensal de < 5% para < 3% — o dashboard de conversão e os alertas de preço criam dependência diária do produto.
- **Diferenciação competitiva**: nenhum concorrente direto no Brasil (Calcme, Promob) oferece link de aprovação digital rastreável. Esse diferencial deve ser percebido por ≥ 60% dos novos cadastros como razão de upgrade do trial para pago.
- **Viralidade orgânica**: cada orçamento aprovado via link expõe a marca Orça Fácil ao cliente final. Meta: ≥ 10% dos novos cadastros originados de clientes que receberam links de aprovação.

---

## Histórias de Usuário

### Persona principal: Marceneiro autônomo

- Como marceneiro, quero enviar ao cliente um link onde ele pode aprovar o orçamento com um clique para receber confirmação sem precisar esperar uma resposta no WhatsApp.
- Como marceneiro, quero ser notificado por e-mail quando o cliente aprovar o orçamento para agir imediatamente enquanto o cliente ainda está engajado.
- Como marceneiro, quero ver um alerta no produto quando um orçamento enviado estiver prestes a vencer para não deixar uma oportunidade passar sem follow-up.
- Como marceneiro, quero receber um lembrete automático quando um orçamento enviado não foi aprovado após X dias para não esquecer de entrar em contato.
- Como marceneiro, quero ter um catálogo de materiais pré-preenchido para o meu estado logo após o cadastro para criar meu primeiro orçamento sem configurar nada.
- Como marceneiro, quero ver automaticamente quantas chapas de MDF preciso comprar quando informo as medidas no orçamento para não errar o pedido de material.
- Como marceneiro, quero ser alertado quando o preço de um item do catálogo não foi atualizado há muito tempo para não criar orçamentos com custo desatualizado e perder margem.
- Como marceneiro, quero adicionar fotos de referência ao orçamento para que o PDF mostre ao cliente a inspiração do projeto e pareça mais profissional.
- Como marceneiro, quero ter uma mensagem padrão editável no WhatsApp que já inclua o link de aprovação para não redigir do zero a cada orçamento.
- Como marceneiro, quero um dashboard simples que me mostre quantos orçamentos enviei e quantos foram aprovados para saber se estou precificando bem.

### Persona secundária: Dono de pequena marcenaria (2–5 pessoas)

- Como dono de marcenaria, quero que os orçamentos enviados pela equipe tenham rastreabilidade de aprovação para saber quais negociações estão abertas.
- Como dono de marcenaria, quero ver minha taxa de conversão mensal para decidir quando e quanto ajustar os preços.

### Persona terciária: Cliente do marceneiro (usuário do link)

- Como cliente, quero visualizar o orçamento num layout claro no celular para entender o que está sendo orçado sem precisar abrir um PDF.
- Como cliente, quero aprovar o orçamento com um clique para não precisar voltar ao WhatsApp só para dizer "aprovado".
- Como cliente, quero ter a opção de entrar em contato diretamente com o marceneiro pelo botão "Tenho dúvidas" para tirar dúvidas antes de aprovar.

---

## Features Principais

### 1. Link de Aprovação Digital pelo Cliente

O marceneiro compartilha um link (além do PDF) e o cliente aprova com um clique — sem instalar nada, sem criar conta.

**O que faz:**
- Ao gerar o orçamento (etapa 4 do wizard), o sistema cria automaticamente um link público único com token opaco (ex.: `orcafacil.com.br/o/[token]`).
- A página exibe: logo da marcenaria, resumo de ambientes e valores, comparação de versões (quando houver múltiplas), prazo de validade e contato do marceneiro.
- O cliente pode clicar em **"Aprovar"** — status muda para aprovado, marceneiro notificado por e-mail e alerta in-app.
- O cliente pode clicar em **"Tenho dúvidas"** — abre o WhatsApp do marceneiro com mensagem pré-preenchida.
- A página exibe estado "já aprovado" se o cliente acessar novamente após clicar em Aprovar.
- A página exibe estado "orçamento vencido" se o prazo de validade passou.
- O link expira quando o orçamento vence ou é cancelado.
- Rodapé da página: "Gerado com Orça Fácil" (link de marketing orgânico).

**Interação com outras features:** integra-se ao Modelo de Mensagem WhatsApp (o link é incluído na mensagem padrão), ao Follow-up (o follow-up verifica se o link foi ativado), e às Notificações de Vencimento (quando o link expira, o marceneiro é alertado).

---

### 2. Follow-up Automático

O produto lembra o marceneiro de retornar ao cliente, eliminando o maior motivo de perda de venda: o esquecimento.

**O que faz:**
- O marceneiro configura um prazo de follow-up padrão nas configurações (opções: 3, 5 ou 7 dias após o envio).
- Quando o prazo chega e o orçamento ainda está em status "enviado" (não aprovado), o sistema envia e-mail ao marceneiro via Resend e exibe alerta in-app.
- O alerta in-app traz acesso direto ao orçamento e ao contato do cliente (nome + telefone).
- O prazo de follow-up pode ser ignorado (o marceneiro descarta o alerta) sem afetar o status do orçamento.

---

### 3. Dashboard de Conversão

Transforma os dados de orçamentos em inteligência de negócio simples, acessível para qualquer marceneiro.

**O que faz:**
- Nova seção no menu de navegação (entrada "Desempenho" ou "Resultados").
- Métricas exibidas: orçamentos enviados, aprovados, taxa de conversão (%), ticket médio dos aprovados, valor total aprovado no período.
- Filtro por período: último mês, últimos 3 meses, últimos 6 meses, personalizado.
- Exibe apenas dados do próprio marceneiro (sem comparação entre usuários).
- Gráfico simples de barras ou linha mostrando conversão ao longo do tempo.

---

### 4. Catálogo Pré-preenchido por Região

Elimina a principal causa de abandono no onboarding: a necessidade de configurar o catálogo do zero antes do primeiro orçamento.

**O que faz:**
- Após o cadastro, o sistema apresenta uma tela de onboarding de catálogo: o marceneiro informa seu estado e recebe uma lista de itens sugeridos (materiais e serviços comuns de marcenaria com preços de referência regionais).
- O marceneiro pode importar todos os itens em lote, selecionar itens individuais (checkbox), ou clicar em "Pular por agora".
- Os itens importados entram como itens normais do catálogo próprio, editáveis como qualquer outro.
- Preços de referência obtidos de fonte externa a definir (com fallback para dados estáticos se a fonte estiver indisponível).
- Pular o onboarding não bloqueia o primeiro orçamento.

---

### 5. Calculadora de Chapas Embutida

Poupa o marceneiro de um cálculo manual que ele faz toda obra — quantas chapas de MDF precisam ser compradas.

**O que faz:**
- No wizard (etapa de ambientes), ao adicionar um item com unidade m², o sistema exibe automaticamente abaixo do campo de quantidade: *"Estimativa: X chapas (considerando Y% de perda)"*.
- Tamanho padrão da chapa: 2750 × 1830mm.
- O percentual de perda é configurável globalmente nas configurações (padrão: 15%).
- A informação é auxiliar — não substitui o valor inserido pelo marceneiro e não afeta o orçamento.

---

### 6. Alerta de Preços Desatualizados

Protege o marceneiro de criar orçamentos com custo defasado e perder margem sem perceber.

**O que faz:**
- O sistema registra a data da última atualização de preço de cada item do catálogo.
- Quando o prazo configurado (padrão: 60 dias; opções: 30, 60 ou 90 dias) é atingido sem atualização e o item foi usado em orçamentos recentes, o sistema exibe:
  - Badge de aviso no item no catálogo.
  - Alerta inline ao selecionar o item no wizard.
- Ambos os alertas têm ação rápida "Atualizar preço" que leva diretamente ao item no catálogo.
- O prazo de alerta é configurável nas configurações do perfil.

---

### 7. Fotos de Referência no PDF

Aumenta a percepção de profissionalismo e personalização do orçamento com mínimo esforço do marceneiro.

**O que faz:**
- No wizard (etapa de ambientes), o marceneiro pode fazer upload de 1–3 fotos por ambiente (inspiração, foto do espaço ou projeto similar).
- As fotos aparecem no PDF somente no **modo detalhado**, dentro da seção do ambiente correspondente.
- Tamanho máximo por foto: 5MB. Formatos aceitos: JPG, PNG, WEBP.
- As fotos são armazenadas de forma segura (acesso privado com URL assinada).

---

### 8. Modelo de Mensagem WhatsApp Editável

Padroniza a comunicação do marceneiro e garante que o link de aprovação sempre seja incluído no envio.

**O que faz:**
- Na etapa 4 do wizard (envio), antes de abrir o WhatsApp, o sistema exibe uma prévia da mensagem com campos pré-preenchidos: nome do cliente, número do orçamento, valor total e link de aprovação.
- O marceneiro pode editar a mensagem antes de enviar.
- O marceneiro pode salvar o modelo como padrão nas configurações do perfil para reutilização.
- Ao confirmar, o WhatsApp é aberto com a mensagem pré-preenchida no corpo.

---

### 9. Notificação de Orçamento Prestes a Vencer

Evita que uma janela de negociação se feche sem que o marceneiro perceba.

**O que faz:**
- 3 dias antes do prazo de validade de um orçamento em status "enviado", o sistema envia e-mail ao marceneiro e exibe alerta in-app.
- O alerta in-app traz duas ações rápidas:
  - **"Renovar validade"**: abre modal para alterar a data de validade.
  - **"Marcar como cancelado"**: fecha o orçamento sem aprovação.
- Ao renovar a validade, o link de aprovação anterior é invalidado e um novo link é gerado com a nova data.

---

## Experiência do Usuário

### Jornada do novo usuário — objetivo: primeiro orçamento em menos de 7 minutos

1. Marceneiro se cadastra com e-mail.
2. Sistema pergunta: *"Qual é o seu estado?"* e exibe lista de itens sugeridos para o catálogo.
3. Marceneiro importa os itens em lote (ou pula) — **1 clique, zero digitação**.
4. Tela inicial: botão único "Criar orçamento".
5. Wizard guia passo a passo: cliente → ambientes → revisão → enviar.
6. Na etapa de ambientes, o marceneiro adiciona MDF e vê automaticamente a estimativa de chapas.
7. Na etapa de envio, a mensagem do WhatsApp já está pré-preenchida com o link de aprovação.
8. WhatsApp abre com a mensagem pronta — o marceneiro pressiona enviar.
9. Quando o cliente clicar em "Aprovar" no link, o marceneiro recebe e-mail e vê o alerta no produto.

### Jornada do cliente ao receber o link

1. Recebe a mensagem do WhatsApp com o link.
2. Abre o link no celular — sem download, sem login.
3. Vê o resumo do orçamento com logo da marcenaria e valores por ambiente.
4. Clica em "Aprovar" — página confirma a aprovação.
5. O marceneiro é notificado em segundos.

### Jornada do marceneiro recorrente — uso semanal

1. Acessa o produto no celular, vê alertas in-app (follow-ups pendentes, orçamentos vencendo, aprovações recebidas).
2. Age diretamente nos alertas: renova validade, contata cliente, comemora aprovação.
3. Consulta o dashboard de conversão mensalmente para ajustar preços ou estratégia de apresentação.
4. Ao criar novos orçamentos, o catálogo já está preenchido e o sistema alerta sobre preços desatualizados antes de enviar.

### Princípios de UX (continuidade da Fase 1)

- **Uma ação principal por tela** — o link de aprovação tem dois botões visíveis, nenhum submenu.
- **Informação auxiliar não bloqueia o fluxo** — a calculadora de chapas é um texto em cinza, nunca um modal.
- **Alertas são acionáveis** — todo alerta in-app tem ao menos uma ação rápida (não apenas informação).
- **Mobile-first em tudo** — a página pública de aprovação é projetada para ser lida e usada em telas de 360px.

---

## Restrições Técnicas de Alto Nível

- A página pública `/o/[token]` deve ser acessível sem autenticação e sem cookies de sessão — qualquer pessoa com o link consegue abrir.
- O token do link não pode expor o ID interno do orçamento ou qualquer dado do marceneiro na URL.
- Fotos de orçamento devem ter acesso privado — URLs diretas não devem funcionar sem assinatura temporal.
- Notificações de follow-up e vencimento devem ser processadas por job agendado diário — o produto não pode depender de ação do usuário para disparar alertas.
- O produto deve continuar funcionando plenamente em smartphones Android e iOS como web app, sem instalação.
- O catálogo regional deve degradar graciosamente: se a fonte externa estiver indisponível, o onboarding exibe dados estáticos de fallback sem mensagem de erro visível ao usuário.

---

## Não-Objetivos (Fora de Escopo)

As features abaixo **não serão desenvolvidas nesta fase**:

- **Aprovação com negociação inline**: o cliente não pode propor ajuste de preço nem deixar texto no link de aprovação — esse fluxo permanece no WhatsApp.
- **Seleção de versão pelo cliente no link**: quando há múltiplas versões, o link exibe comparação informativa, mas a escolha de versão não acontece no link.
- **Assinatura digital com validade jurídica**: a aprovação via link não é um documento juridicamente vinculante — é um sinal de intenção.
- **Envio direto pelo WhatsApp Business API**: a abertura do WhatsApp continua via deep link no celular do marceneiro, não por envio automatizado server-side.
- **Análise comparativa entre marceneiros**: o dashboard exibe apenas dados do próprio usuário.
- **Notificações push nativas**: alertas in-app são exibidos ao abrir o produto, não enviados como push notification do sistema operacional.
- **Histórico de visualizações do link**: o produto não rastreia quantas vezes o cliente abriu o link, apenas se clicou em "Aprovar".
- **Múltiplos usuários por conta**: sai do escopo — permanece como Fase 3.
- **Aplicativo nativo iOS/Android**: permanece como Fase 3.
- **Controle financeiro, estoque ou plano de corte CNC**: fora de escopo permanente nesta versão.

---

## Plano de Lançamento em Fases

### Fase 2A — Core de Fechamento (prioridade máxima)

Features que impactam diretamente a conversão de orçamentos enviados:

1. **Link de Aprovação Digital** — o diferencial central; define o posicionamento da Fase 2.
2. **Modelo de Mensagem WhatsApp** — complementa o link, garante que ele seja sempre enviado.
3. **Follow-up Automático** — ativa o marceneiro no momento certo.
4. **Notificação de Vencimento** — fecha a janela de follow-up antes que ela expire.

**Critérios para avançar à Fase 2B:**
- Link de aprovação usado em ≥ 40% dos orçamentos enviados após 30 dias do lançamento.
- Taxa de aprovação via link ≥ 15% dos orçamentos com link gerado.
- Zero bug crítico em produção por 14 dias.

### Fase 2B — Proteção de Margem e Inteligência

5. **Alerta de Preços Desatualizados** — protege a lucratividade.
6. **Dashboard de Conversão** — cria dependência do produto e âncora para renovação.
7. **Calculadora de Chapas** — reduz erro de material, reforça o valor percebido.

**Critérios para avançar à Fase 2C:**
- ≥ 50% dos usuários ativos acessam o dashboard ao menos 1 vez por mês.
- Churn mensal ≤ 4%.

### Fase 2C — Ativação e Apresentação

8. **Catálogo Pré-preenchido Regional** — reduz tempo até o primeiro orçamento completo.
9. **Fotos de Referência no PDF** — eleva percepção de profissionalismo.

**Critérios de conclusão da Fase 2:**
- 100 usuários pagantes ativos.
- Churn mensal < 3%.
- Tempo mediano do cadastro ao primeiro orçamento com link enviado < 7 minutos.
- NPS ≥ 55.

---

## Métricas de Sucesso

| Métrica | Meta |
|---|---|
| % de orçamentos enviados com link de aprovação | ≥ 60% após 30 dias do lançamento 2A |
| Taxa de aprovação via link (aprovados / links gerados) | ≥ 15% |
| Redução no tempo mediano até primeiro orçamento | < 7 min (vs. < 10 min na Fase 1) |
| % de usuários ativos que acessam dashboard mensalmente | ≥ 50% após lançamento 2B |
| % de novos cadastros originados de links de aprovação | ≥ 10% (viralidade orgânica) |
| Churn mensal ao final da Fase 2 | < 3% |
| NPS ao final da Fase 2 | ≥ 55 |

---

## Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Cliente não clica no link (abre o WhatsApp de qualquer jeito) | O link está dentro da mensagem do WhatsApp — o WhatsApp é o canal de entrega, não o substituto. Se o cliente não clicar, o comportamento é idêntico ao da Fase 1. |
| Marceneiro não usa o modelo de mensagem e não inclui o link | A mensagem padrão já inclui o link; o marceneiro precisa remover ativamente para não enviar. Educação onboarding reforça o hábito. |
| Fonte externa de preços regionais indisponível no lançamento | O catálogo regional vai com dados estáticos de fallback. A feature entrega valor mesmo sem integração dinâmica. |
| Follow-up percebido como spam pelo marceneiro | Configuração de prazo pelo marceneiro (3/5/7 dias) com possibilidade de descarte. E-mail de follow-up tem tom de lembrete pessoal, não de alerta de sistema. |
| Link de aprovação é compartilhado pelo cliente com terceiros | O token é opaco (UUIDv4), sem dados expostos na URL. O terceiro que clicar em "Aprovar" ativará a aprovação — comportamento aceitável pois o próprio cliente compartilhou. |
| Dashboard com dados insuficientes nos primeiros meses | Para marceneiros com poucos orçamentos, o dashboard exibe uma mensagem contextual de "volume insuficiente para análise" em vez de métricas zeradas. |
| Aumento no tempo de geração do PDF com fotos | Fotos são referenciadas por URL assinada dentro do HTML do Puppeteer. Limite de 3 fotos por ambiente e 5MB por foto controlam o impacto. |

---

## Architecture Decision Records

- [ADR-001: Modelo de interação do cliente no link de aprovação — Aprovação simples](adrs/adr-001.md) — Escolha do modelo de um clique (Aprovar / Tenho dúvidas) em detrimento de campo de texto ou seleção de versão, pela menor complexidade e menor atrito para o cliente.

---

## Questões em Aberto

- **Fonte externa de preços regionais**: qual API ou planilha será usada para alimentar o catálogo pré-preenchido? Necessário definir antes do início da Fase 2C. Candidatos: planilha Google Sheets mantida pelo produto, raspagem de preços de fornecedores, ou tabela de referência de sindicatos de marcenaria.
- **Preço final do plano**: ainda em aberto desde a Fase 1 — R$ 49/mês ou R$ 79/mês? O lançamento da Fase 2 com diferenciais visíveis pode justificar o aumento. Impacta diretamente a meta de conversão.
- **Rastreamento de abertura do link**: registrar somente a aprovação (clique em "Aprovar") ou também registrar quando o cliente abriu o link sem aprovar? A segunda opção cria um "visualizado" útil para follow-up mas não foi incluída neste escopo.
- **Follow-up por WhatsApp direto**: se a WhatsApp Business API entrar na Fase 3, o follow-up automático poderá ser enviado diretamente como mensagem — sem depender de o marceneiro abrir o produto. Reavaliar quando a API estiver disponível.
- **Validade do link quando o orçamento é renovado**: o link anterior expira imediatamente na renovação ou mantém uma janela de transição (ex.: 24h)? Definir antes da implementação da feature de renovação.
