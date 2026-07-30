# PRD — Redesign Visual e Autenticação do Orca Fácil

## Visão Geral

O Orca Fácil é um SaaS de orçamentos para marceneiros autônomos e pequenas marcenarias. Hoje o produto funciona, mas sua interface é genérica (paleta azul corporativa, sem identidade visual própria), o fluxo de autenticação usa OTP (código enviado por email ou WhatsApp) e não existe uma landing page real — a raiz do site é um placeholder do Next.js.

Este PRD cobre três entregas em uma única release coesa:

1. **Design system e identidade visual** — paleta, tipografia e componentes próprios da marca Orca Fácil, aplicados a todas as superfícies: produto, PDF de orçamento e landing page.
2. **Autenticação com email e senha** — substituição completa do OTP por cadastro, login e redefinição de senha via email.
3. **Landing page de alta conversão** — página pública apresentando o produto, seus benefícios e o plano de assinatura, com CTA para trial gratuito de 30 dias.

O público-alvo é o marceneiro autônomo: pouco familiarizado com tecnologia, usa celular como dispositivo principal, muitas vezes em obras, e precisa confiar rapidamente em um produto que mexe com preço e fechamento de venda.

---

## Objetivos

- Reduzir o tempo de decisão do visitante na landing page: o valor do produto deve ser compreendido em menos de 5 segundos após o carregamento.
- Aumentar a taxa de conversão do trial para assinante: meta de 10% (benchmark de SaaS de nicho no Brasil com trial sem cartão).
- Eliminar o atrito de login: cadastro e login com email+senha, sem dependência de código OTP enviado por terceiros.
- Garantir experiência coesa em mobile e desktop: nenhuma tela do produto deve exibir layout quebrado em telas ≥ 1024px.
- Aplicar identidade visual consistente em todas as superfícies até o lançamento desta release.

---

## Histórias de Usuário

### Visitante (não cadastrado)

- Como visitante, quero entender o que o Orca Fácil faz em menos de 10 segundos ao chegar na landing page, para decidir se vale criar uma conta.
- Como visitante, quero ver claramente quanto custa e o que o plano inclui, para não ter surpresas após o trial.
- Como visitante, quero iniciar meu trial gratuito de 30 dias com meu email e uma senha, sem precisar esperar um código no celular.

### Marceneiro cadastrado (usuário ativo)

- Como marceneiro, quero acessar o sistema com meu email e senha, para não depender de código OTP que às vezes não chega.
- Como marceneiro, quero redefinir minha senha por email caso esqueça, para recuperar acesso sem precisar de suporte.
- Como marceneiro, quero que o sistema funcione bem no meu celular e também no notebook quando estou no escritório, para não perder funcionalidade por trocar de dispositivo.
- Como marceneiro, quero que o PDF que eu envio ao meu cliente tenha uma aparência profissional com tipografia adequada, para transmitir credibilidade na hora de fechar um orçamento.

### Marceneiro novo (primeiro acesso após landing page)

- Como marceneiro recém-cadastrado, quero que a interface do produto tenha a mesma identidade visual da landing page que me convenceu a testar, para sentir que é um produto sério e bem cuidado.

---

## Features Principais

### 1. Design System e Identidade Visual

O Orca Fácil ganha uma identidade visual própria — coesa, profissional e adequada ao seu público.

**Paleta de cores:**
- Primária/CTA: `#C2703A` (terracota/âmbar queimado) — botões de ação principal
- Apoio: `#2D5D5A` (petróleo escuro) — sidebar, headers, ícones secundários
- Fundo: `#FAF7F2` (bege quente) — substitui o branco puro genérico
- Texto principal: `#2B2621` (quase preto, tom quente)
- Bordas/divisores: `#E5DDD3`
- Sucesso: `#4A7C59` | Alerta: `#D4A017` | Erro: `#B3403A`

**Tipografia:**
- Interface do produto: **Manrope** (Google Fonts) — sans-serif com excelente legibilidade em telas pequenas e numerais bem diferenciados (essencial para valores em R$)
- PDF do orçamento: títulos em **Source Serif 4** (transmite documento profissional), corpo e tabelas em Manrope
- Tamanho mínimo em mobile: 16px — nunca menor, independentemente do componente

**Logo e favicon:**
- Logotipo tipográfico "Orça Fácil" em Manrope Bold, cor petróleo (`#2D5D5A`)
- Ícone geométrico: esquadro de marceneiro (ângulo reto) com check em terracota (`#C2703A`)
- Versão reduzida (só o ícone) para favicon: SVG + PNG em 16×16, 32×32 e 180×180 (Apple Touch Icon)

**Escopo de aplicação:** landing page, todas as telas autenticadas, emails de autenticação e PDF de orçamento.

---

### 2. Autenticação com Email e Senha

Substituição completa do fluxo OTP atual por autenticação tradicional com email e senha.

**Telas:**
- **Cadastro:** nome, email, senha (com confirmação). Ao cadastrar, o trial de 30 dias inicia automaticamente. Email de boas-vindas enviado.
- **Login:** email e senha. Link "Esqueci minha senha" visível.
- **Redefinição de senha — Etapa 1:** campo de email; ao enviar, o sistema dispara email com link seguro de redefinição (válido por tempo limitado).
- **Redefinição de senha — Etapa 2:** nova senha e confirmação, após clicar no link recebido.

**Comportamento:**
- Todos os usuários existentes (cadastrados via OTP) precisam definir uma senha no próximo acesso — o produto exibe um prompt de migração na primeira vez após a release.
- Mensagens de erro claras: email já cadastrado, senha fraca, link expirado.
- Todos os estados de loading e erro visíveis ao usuário em tempo real.

---

### 3. Layout Responsivo: Sidebar + Bottom Nav

O produto passa a ter dois layouts distintos conforme o dispositivo:

**Mobile (< 1024px) — bottom navigation:**
- Mantém o bottom nav atual com 4 abas: Orçamentos, Clientes, Catálogo, Configurações.
- Redesenhado com a nova paleta e tipografia.
- Item ativo: cor primária (`#C2703A`). Inativo: neutro.

**Desktop (≥ 1024px) — sidebar fixa:**
- Sidebar lateral fixa à esquerda com logo, itens de navegação (Orçamentos, Clientes, Catálogo, Configurações) e atalho de perfil/logout no rodapé.
- Conteúdo principal ocupa o restante da tela à direita.
- Nenhuma tela do produto exibe layout de coluna única centralizada em desktop — o espaço disponível deve ser aproveitado.

---

### 4. Landing Page de Alta Conversão

Página pública em `/` apresentando o Orca Fácil para marceneiros que ainda não conhecem o produto.

**Seções:**

1. **Hero:** headline focada no ganho de tempo ("Crie orçamentos de móveis planejados em minutos, direto do celular"), subheadline com reforço de credibilidade, CTA principal "Testar Grátis por 30 Dias" sem cartão de crédito.

2. **Features/Benefícios (4 cards):**
   - Criar e enviar orçamentos em minutos
   - Catálogo de materiais sempre à mão
   - PDF profissional com a cara da sua marcenaria
   - Controle de clientes e histórico de orçamentos

3. **Pricing:** card único — R$ 49,90/mês após 30 dias de trial gratuito, sem cartão de crédito para começar. Lista de itens incluídos no plano. CTA "Começar Grátis".

4. **CTA final:** banner de encerramento com headline de reforço e botão de cadastro.

**Requisitos de qualidade:**
- Contraste AA (WCAG 2.1) em todos os elementos.
- Carregamento sem layout shift perceptível (LCP otimizado).
- Responsiva: funciona perfeitamente em mobile e desktop.

---

### 5. Metadados e Favicon

**Favicon:** ícone da marca (esquadro + check) em SVG e PNG (16×16, 32×32, 180×180), servido a partir de `/public`.

**Metadados por página (via Next.js Metadata API):**
- `/` (landing): title "Orça Fácil — Orçamentos de Móveis Planejados para Marceneiros", description focada no valor do produto, OG image com visual da landing.
- `/login`, `/cadastro`, `/redefinir-senha`: titles específicos, sem indexação por robôs.
- Páginas internas do produto: titles contextuais (ex.: "Orçamentos — Orça Fácil").
- OG tags completas (og:title, og:description, og:image, og:url) na landing page.

---

## Experiência do Usuário

### Personas

**João, marceneiro autônomo, 42 anos:**
Trabalha sozinho, usa Android, acessa o sistema pelo celular na obra ou em casa no notebook. Não é nativo digital — prefere clareza a recursos. A maior dor é o tempo gasto fazendo orçamento no papel ou no Excel, e o constrangimento de mandar um PDF "feio" para o cliente.

**Ana, dona de marcenaria pequena, 35 anos:**
Tem 2 funcionários, acessa mais pelo computador, envia orçamentos por WhatsApp. Quer que o PDF tenha a cara da empresa dela.

### Fluxo 1: Primeiro contato → Trial

1. Visitante chega à landing page (orgânico, indicação ou anúncio).
2. Lê headline, entende o produto em segundos.
3. Clica em "Testar Grátis por 30 Dias".
4. Tela de cadastro: preenche nome, email, senha.
5. Conta criada → trial ativo → redireciona para dashboard.
6. Banner de trial visível com dias restantes.

### Fluxo 2: Login recorrente

1. Usuário acessa o domínio.
2. Tela de login — email e senha.
3. Entra no dashboard.

### Fluxo 3: Esqueci minha senha

1. Na tela de login, clica em "Esqueci minha senha".
2. Informa o email.
3. Recebe email com link seguro.
4. Clica no link, define nova senha.
5. Redireciona para login com mensagem de sucesso.

### Fluxo 4: Usuário existente (migração OTP → senha)

1. Usuário tenta acessar após a release.
2. Tela exibe prompt: "Agora usamos email e senha. Defina sua senha para continuar."
3. Link de definição de senha enviado ao email cadastrado.
4. Usuário define senha → acessa normalmente.

### Considerações de Acessibilidade

- Fonte mínima de 16px em mobile em todos os componentes.
- Contraste AA (WCAG 2.1) em todas as combinações de cor de texto e fundo.
- Botões com área de toque mínima de 44×44px.
- Estados de foco visíveis em todos os elementos interativos.

---

## Restrições Técnicas de Alto Nível

- Autenticação gerenciada inteiramente pelo Supabase Auth — sem implementação própria de tokens ou hashing de senha.
- Metadados gerados via Next.js Metadata API — sem tags `<head>` manuais em Client Components.
- Favicon entregue como SVG + PNG nas três resoluções padrão.
- Tipografia carregada via Google Fonts (Manrope, Source Serif 4) — sem dependência de fontes pagas.
- O PDF continua sendo gerado pelo Puppeteer existente — apenas o template HTML e o CSS inline são atualizados para a nova tipografia e paleta.
- Nenhum token ou segredo do Supabase pode ser exposto no bundle do cliente.

---

## Não-Objetivos (Fora de Escopo)

- Login social (Google, GitHub ou qualquer OAuth) — adiado.
- Redefinição de senha via WhatsApp — adiado.
- Seção de depoimentos na landing page — adiada (sem depoimentos reais disponíveis agora).
- Dark mode — não está no escopo desta release.
- Internacionalização (i18n) — não está no escopo.
- Modo offline — não está no escopo.
- Integração com WhatsApp para envio de PDF — feature já existe e não muda nesta release.
- Mudanças no fluxo de cobrança (AbacatePay, planos, valores) além do que está na landing page.

---

## Plano de Lançamento em Fases

### Fase 1 — Fundação (Design System + Auth)

**O que entrega:**
- Design system: tokens de cor, tipografia (Manrope), componentes base (botão, input, badge, card).
- Logo e favicon (SVG + PNG).
- Substituição completa do OTP por email+senha (cadastro, login, reset).
- Prompt de migração para usuários existentes.
- Metadados corrigidos em todas as páginas existentes.

**Critério de avanço:** usuário consegue criar conta, fazer login e redefinir senha sem OTP. Design system aplicado ao menos nos componentes compartilhados (botão, input, layout base).

---

### Fase 2 — Produto Interno Redesenhado

**O que entrega:**
- Layout responsivo: sidebar em desktop (≥ 1024px) + bottom nav mobile redesenhado.
- Todas as telas internas (orçamentos, clientes, catálogo, configurações, dashboard) com nova paleta e tipografia.
- Estados de vazio, loading e erro redesenhados.
- PDF de orçamento atualizado: Source Serif 4 nos títulos, Manrope no corpo.

**Critério de avanço:** nenhuma tela interna exibe a paleta azul/cinza anterior; layout desktop funcional em todas as rotas.

---

### Fase 3 — Landing Page

**O que entrega:**
- Landing page pública em `/` com as quatro seções (hero, features, pricing, CTA final).
- OG tags e metadados da landing page.
- CTA conectado ao fluxo de cadastro da Fase 1.

**Critério de avanço:** visitante anônimo acessa `/`, entende o produto, clica em "Testar Grátis" e completa o cadastro sem erros.

---

## Métricas de Sucesso

- **Taxa de conversão landing → cadastro:** meta ≥ 5% dos visitantes únicos.
- **Taxa de conversão trial → assinante:** meta ≥ 10%.
- **Taxa de sucesso no fluxo de login:** ≥ 95% dos usuários que tentam logar conseguem na primeira tentativa (sem erros de senha ou necessidade de reset imediato).
- **Cobertura de layout desktop:** 100% das rotas internas do produto sem layout quebrado em 1440×900.
- **Conformidade de contraste:** 100% das combinações texto/fundo atendem WCAG 2.1 AA.
- **Tempo de carregamento da landing page:** LCP ≤ 2,5s em conexão 4G simulada.

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Usuários existentes (OTP) não receberem o email de migração e perderem acesso | Média | Alto | Fluxo de migração explícito na primeira visita pós-release; suporte por email como fallback. |
| Design system tomar mais tempo que o previsto e atrasar landing page e produto | Média | Médio | Definir entregável mínimo da Fase 1: apenas tokens e 4 componentes base são suficientes para desbloquear as outras frentes. |
| Landing page não converter por headline ou copy inadequados | Média | Médio | Copy pode ser iterado sem nova release (só texto); monitorar bounce rate e tempo na página na primeira semana. |
| PDF com nova tipografia quebrar em algum ambiente Puppeteer (Google Fonts indisponível) | Baixa | Alto | Testar carregamento de fontes no template HTML antes de deploy; fallback para fonte system-ui no CSS do PDF. |

---

## Architecture Decision Records

- [ADR-001: Estratégia de Entrega — Uma Release, Três Frentes em Paralelo](adrs/adr-001.md) — Optar por entregar design system, autenticação e landing page em uma única release coesa em vez de releases sequenciais separadas.

---

## Questões em Aberto

- **Copy da headline do hero:** "Crie orçamentos de móveis planejados em minutos, direto do celular" é uma sugestão — validar com usuários reais antes do lançamento ou em teste A/B.
- **Email de boas-vindas:** o conteúdo e o design do email pós-cadastro não foram especificados; deve ser definido antes da Fase 1.
- **Migração de usuários OTP:** se houver usuários com número de telefone (WhatsApp) como identificador principal (sem email), o fluxo de migração precisa de tratamento especial — verificar na base de dados antes da release.
- **OG Image da landing page:** a imagem de Open Graph precisa ser criada (screenshot do produto ou arte personalizada) — não bloqueante para a Fase 1, mas necessária antes da Fase 3.
