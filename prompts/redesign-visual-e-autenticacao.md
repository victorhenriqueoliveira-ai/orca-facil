<task>
Redesign Visual e Autenticação do Orca Fácil
</task>

<goal>
Elevar a qualidade do produto Orca Fácil em três frentes: (1) redesenhar toda a interface com um design system profissional e identidade visual própria, tornando o produto mais confiável e fácil de usar para marceneiros autônomos; (2) implementar fluxo de autenticação completo com cadastro, login e redefinição de senha por email; (3) criar uma landing page de alta conversão que apresente o produto e converta visitantes em assinantes pagantes. A identidade visual também impacta o PDF de orçamento que o marceneiro envia ao cliente final — a vitrine da marca dele — então profissionalismo é prioridade dupla.
</goal>

<requirements>
Negocio:
- Usuário-alvo: marceneiro autônomo, pouco familiarizado com tecnologia, usa celular como dispositivo principal, frequentemente em obras
- A identidade visual deve remeter ao ofício da marcenaria e transmitir confiança — não deve parecer loja de móveis nem SaaS azul corporativo genérico
- Trial de 30 dias no momento do cadastro, conforme já existe no produto
- Plano único: R$ 49,90/mês, cobrado após o trial
- Fluxo de autenticação: cadastro com email + senha, login com email + senha, redefinição de senha via link por email
- Sem login social nesta versão
- Landing page com seções: hero (headline + CTA), features/benefícios do produto, pricing (plano único R$ 49,90/mês), CTA final para cadastro/trial
- Sem seção de depoimentos nesta versão
- Favicon e metadados (title, description, OG tags) corretos em todas as páginas do produto e da landing page

Arquitetura:
- Stack: Next.js (App Router), Supabase Auth para autenticação (email/senha + magic link para reset de senha), Tailwind CSS
- Layout responsivo: sidebar fixa em desktop (≥ 1024px), bottom navigation em mobile (< 1024px)
- Design system com componentes reutilizáveis que apliquem a paleta e a tipografia definidas
- Metadados gerados via Next.js Metadata API em cada layout e page — sem tags `<head>` manuais
- Favicon gerado como SVG + PNG (16x16, 32x32, 180x180) em /public

UI/UX:
- Paleta de cores:
  - Primária/CTA (botões de ação principal): #C2703A (terracota/âmbar queimado)
  - Apoio (headers, ícones secundários, sidebar): #2D5D5A (petróleo escuro)
  - Fundo: #FAF7F2 (bege quente — não branco puro)
  - Texto principal: #2B2621 (quase preto, tom quente)
  - Bordas/divisores: #E5DDD3
  - Sucesso: #4A7C59 | Alerta: #D4A017 | Erro: #B3403A
- Tipografia:
  - Interface do produto: Inter ou Manrope (Google Fonts) — corpo mínimo 16px em mobile (nunca menos — usuário pode estar sob sol de obra)
  - PDF do orçamento: títulos em Source Serif 4 ou Lora, corpo/tabela em Inter
  - Numerais (valores em R$) devem usar fonte com dígitos bem diferenciados
- Logo e favicon: logotipo tipográfico "Orça Fácil" em Manrope Bold (cor petróleo), ícone de esquadro (ângulo reto de marceneiro) com check em terracota; versão reduzida apenas do ícone para favicon e app icon
- Layout de produto (área logada): sidebar com navegação em desktop, bottom nav com os itens principais em mobile
- Landing page: hero com headline forte + CTA para trial, seção de features/benefícios, pricing card único, CTA final
- Páginas de autenticação: tela de login, tela de cadastro, tela de solicitação de redefinição de senha, tela de criação de nova senha (após link de email)
- Todos os estados de interface: loading, erro, vazio (zero orçamentos, zero clientes, etc.)
- Contraste mínimo AA (WCAG 2.1) em todas as combinações de texto/fundo
</requirements>

<acceptance_criteria>
- Dado que um visitante acessa a landing page, ele vê hero com CTA, seção de features, pricing (R$ 49,90/mês) e CTA final de cadastro
- Dado que o visitante clica em cadastrar na landing page, ele é levado ao fluxo de cadastro com email + senha e trial de 30 dias
- Dado que um usuário cadastrado acessa o app em mobile (< 1024px), ele vê bottom navigation funcional com os itens principais
- Dado que um usuário cadastrado acessa o app em desktop (≥ 1024px), ele vê sidebar fixa com os itens principais
- Dado que o usuário solicita redefinição de senha, ele recebe email com link seguro e consegue criar nova senha ao clicar nele
- Dado que qualquer página é carregada, title, description e OG tags estão corretos e específicos para aquela página
- Dado que o favicon é requisitado, o ícone da marca (esquadro + check) aparece legível em 16x16, 32x32 e 180x180
- Dado que o usuário vê qualquer tela, o contraste entre texto e fundo atende WCAG 2.1 nível AA
- Dado que o usuário acessa o PDF de orçamento gerado, ele vê a tipografia com títulos em Source Serif 4 / Lora e corpo em Inter
</acceptance_criteria>

<constraints>
- FAÇA: usar Supabase Auth para toda a camada de autenticação — cadastro, login, reset de senha (sem reimplementar lógica de token)
- FAÇA: gerar favicon como SVG + PNG nas resoluções 16x16, 32x32 e 180x180 (Apple Touch Icon)
- FAÇA: usar Next.js Metadata API para todos os metadados — nunca tags `<head>` manuais em Client Components
- FAÇA: garantir fonte mínima de 16px em mobile em todos os textos da interface
- FAÇA: aplicar contraste mínimo AA (WCAG 2.1) em todas as combinações de cor de texto e fundo
- NÃO FAÇA: adicionar login social (Google, GitHub, etc.) nesta versão
- NÃO FAÇA: incluir seção de depoimentos na landing page nesta versão
- NÃO FAÇA: integrar WhatsApp para redefinição de senha nesta versão
- NUNCA: expor tokens ou segredos do Supabase no bundle do cliente
</constraints>
