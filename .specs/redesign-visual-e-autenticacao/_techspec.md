# TechSpec — Redesign Visual e Autenticação do Orca Fácil

## Executive Summary

Esta spec cobre três entregas coordenadas: (1) design system baseado em tokens CSS no `@theme` do Tailwind v4, (2) substituição completa do fluxo OTP por email+senha via Supabase Auth, e (3) landing page pública + layout responsivo com sidebar desktop.

A abordagem maximiza reuso: o layout autenticado existente (`app/(app)/layout.tsx`) recebe sidebar e bottom nav no mesmo arquivo com CSS responsivo; os tokens definidos em `globals.css` alimentam componentes UI, landing page e PDF sem duplicação; o callback de auth existente é reaproveitado para o reset de senha sem mudança de contrato.

**Principal trade-off:** usuários existentes (criados via OTP) precisam passar pelo fluxo de "redefinir senha" para definir uma senha pela primeira vez — atrito pontual inevitável dado que o Supabase não distingue programaticamente "senha errada" de "sem senha".

---

## System Architecture

### Component Overview

```
app/
├── layout.tsx                        [MODIFICADO] troca Geist → Manrope, atualiza metadata root
├── globals.css                       [MODIFICADO] adiciona bloco @theme com tokens de cor/fonte
│
├── (marketing)/
│   └── page.tsx                      [NOVO] landing page (hero, features, pricing, CTA)
│
├── (auth)/
│   ├── login/page.tsx                [MODIFICADO] OTP → email+senha
│   ├── cadastro/page.tsx             [NOVO] signup com nome, email, senha
│   ├── redefinir-senha/page.tsx      [NOVO] solicitar reset (campo de email)
│   ├── nova-senha/page.tsx           [NOVO] definir nova senha (pós-link)
│   └── [verify/page.tsx]             [REMOVIDO]
│
├── api/auth/callback/route.ts        [MANTIDO] já processa exchangeCodeForSession
│
└── (app)/
    ├── layout.tsx                    [MODIFICADO] adiciona <Sidebar> + lógica responsiva
    └── [todas as páginas internas]   [MODIFICADOS] substituem classes blue/gray pela nova paleta

components/
├── sidebar.tsx                       [NOVO] navegação lateral desktop
├── bottom-nav.tsx                    [MODIFICADO] restyle com nova paleta
├── trial-banner.tsx                  [MODIFICADO] restyle
└── ui/
    ├── button.tsx                    [NOVO] componente base reutilizável
    ├── input.tsx                     [NOVO] componente base reutilizável
    ├── card.tsx                      [NOVO] componente base reutilizável
    └── badge.tsx                     [NOVO] componente base reutilizável

public/
├── favicon.svg                       [NOVO]
├── favicon-16x16.png                 [NOVO]
├── favicon-32x32.png                 [NOVO]
└── apple-touch-icon.png              [NOVO] 180×180

lib/pdf/template.ts                   [MODIFICADO] paleta de cores atualizada, fontes mantidas (Arial)
```

**Fluxo de dados de auth:**

```
Visitante
  → /              (landing, público)
  → /cadastro      (signup → supabase.signUp → redirect /dashboard)
  → /login         (signInWithPassword → redirect /dashboard | erro → hint reset)
  → /redefinir-senha → email com link → /nova-senha → supabase.updateUser
  → /api/auth/callback (troca code por session no reset flow)

Usuário OTP existente
  → /login → falha signInWithPassword → "Defina sua senha via link de redefinição"
  → mesmo fluxo de /redefinir-senha
```

---

## Implementation Design

### Core Interfaces

**Tokens de design — `app/globals.css`:**

```css
@theme {
  /* Identidade Orca Fácil */
  --color-brand-primary:  #C2703A;
  --color-brand-support:  #2D5D5A;
  --color-bg-base:        #FAF7F2;
  --color-text-base:      #2B2621;
  --color-border:         #E5DDD3;
  --color-success:        #4A7C59;
  --color-warning:        #D4A017;
  --color-error:          #B3403A;
  /* Tipografia */
  --font-sans: var(--font-manrope);
}
```

**Chamadas Supabase Auth — contratos das novas páginas:**

```typescript
// /cadastro
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { name } },
})

// /login
const { error } = await supabase.auth.signInWithPassword({ email, password })

// /redefinir-senha
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${origin}/api/auth/callback?next=/nova-senha`,
})

// /nova-senha (Client Component, pós-callback)
await supabase.auth.updateUser({ password: novaSenha })
```

**Layout responsivo — `app/(app)/layout.tsx`:**

```tsx
export default async function AppLayout({ children }) {
  // ... auth check + subscription fetch (sem mudança)
  return (
    <SubscriptionProvider subscription={subscription}>
      <div className="flex min-h-screen bg-bg-base">
        <Sidebar className="hidden lg:flex w-64 shrink-0" />
        <div className="flex flex-col flex-1 min-w-0">
          {showTrialBanner && <TrialBanner daysLeft={daysLeft} />}
          <main className="flex-1 pb-16 lg:pb-0 p-4 lg:p-8">
            {children}
          </main>
          <BottomNav className="lg:hidden" />
        </div>
      </div>
    </SubscriptionProvider>
  )
}
```

**Componente Button — `components/ui/button.tsx`:**

```tsx
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
        'disabled:opacity-50 disabled:pointer-events-none min-h-[44px]',
        variants[variant], sizes[size], className
      )}
      {...props}
    />
  )
}
```

---

### Data Models

Nenhuma alteração de schema de banco de dados. As tabelas existentes (`subscriptions`, `profiles`, `quotes`, etc.) permanecem sem mudança.

**Único ajuste de dados:** ao criar conta via `signUp`, o campo `name` é gravado em `auth.users.raw_user_meta_data`. Se o `profiles` trigger existente já copia esse campo para a tabela `profiles`, nenhuma ação adicional é necessária — verificar antes da implementação.

---

### API Endpoints

Nenhum endpoint novo. Reuso:

| Método | Rota | Mudança |
|--------|------|---------|
| `GET` | `/api/auth/callback` | Mantido — já lida com `exchangeCodeForSession`; adicionar suporte ao param `next` para redirecionar para `/nova-senha` após reset |
| `GET` | `/api/auth/logout` | Mantido sem mudança |

O parâmetro `next` no callback:

```typescript
// app/api/auth/callback/route.ts — adição mínima
const next = requestUrl.searchParams.get('next') ?? '/dashboard'
// ...após exchangeCodeForSession com sucesso:
return NextResponse.redirect(new URL(next, origin))
```

---

## Integration Points

**Supabase Auth:**
- Métodos usados: `signUp`, `signInWithPassword`, `resetPasswordForEmail`, `updateUser`
- `resetPasswordForEmail` envia email via Supabase (ou Resend, dependendo da config do projeto no dashboard Supabase) — verificar se o template de email de reset está configurado no painel Supabase antes do deploy
- Nenhuma credencial nova — usa `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` já presentes

**Resend (já no stack):**
- Usado atualmente para outros emails do sistema
- Email de boas-vindas pós-cadastro: pode ser disparado via Supabase Auth hook ou via `api/auth/callback` após `signUp` — definir antes da implementação (questão em aberto do PRD)

**Google Fonts:**
- Manrope e Source Serif 4 carregados via `next/font/google` no `app/layout.tsx`
- PDF mantém Arial/Helvetica (sem dependência de CDN no Puppeteer)

---

## Impact Analysis

| Componente | Tipo de Impacto | Descrição e Risco | Ação Necessária |
|-----------|----------------|-------------------|-----------------|
| `app/(auth)/login/page.tsx` | Modificado | Troca `signInWithOtp` por `signInWithPassword` — quebra o fluxo atual | Reescrever página completa |
| `app/(auth)/verify/page.tsx` | Descontinuado | Sem uso após remoção do OTP | Deletar arquivo |
| `app/api/auth/callback/route.ts` | Modificado | Adicionar suporte ao param `?next=` | Mudança mínima (2 linhas) |
| `app/layout.tsx` | Modificado | Troca fonte e metadata | Baixo risco |
| `app/globals.css` | Modificado | Adiciona bloco `@theme` — não quebra nada existente | Baixo risco |
| `app/(app)/layout.tsx` | Modificado | Adiciona Sidebar, refatora estrutura flex | Médio risco — testar todos os viewports |
| `components/bottom-nav.tsx` | Modificado | Restyle com nova paleta | Baixo risco funcional |
| `lib/pdf/template.ts` | Modificado | Troca cores hardcoded (`#2563eb` → `#2D5D5A`, etc.) | Médio risco — testar geração de PDF |
| Todas as páginas em `app/(app)/` | Modificado | Substituição de classes `blue-*`/`gray-*` pela nova paleta | Risco de regressão visual — revisar página a página |
| `app/page.tsx` | Substituído | Placeholder Next.js → landing page real | Alto impacto positivo, baixo risco técnico |

---

## Testing Approach

### Unit Tests

- `components/ui/button.tsx`, `input.tsx`, `card.tsx`, `badge.tsx`: testar variantes e estados (disabled, loading) com Vitest + React Testing Library
- `lib/pdf/template.ts`: snapshot test do HTML gerado — garantir que as novas cores aparecem e as antigas (`#2563eb`) não

### Integration Tests

- Fluxo de cadastro: `signUp` → criação de registro em `profiles` → redirect para `/dashboard`
- Fluxo de reset: `resetPasswordForEmail` → callback → `updateUser` → redirect para login
- Layout responsivo: verificar com `@media` mock que sidebar e bottom nav não coexistem visivelmente

### Checklist manual antes do deploy

- [ ] Login com email+senha funciona para usuário novo
- [ ] Usuário OTP existente → falha login → mensagem orienta reset → reset funciona
- [ ] PDF gerado com novas cores (sem azul corporativo)
- [ ] Favicon aparece em Chrome, Safari mobile, aba do navegador
- [ ] Landing page sem layout shift em 375px, 768px, 1440px
- [ ] Sidebar visível em 1024px+; bottom nav visível em 1023px-
- [ ] Todas as páginas internas sem classes `blue-600` residuais

---

## Development Sequencing

### Build Order

1. **Tokens `@theme` em `globals.css`** — sem dependências; habilita todas as classes `bg-brand-*` para os passos seguintes
2. **Fonte Manrope em `app/layout.tsx` + metadata root** — depende do passo 1; habilita `font-sans` nos componentes
3. **Arquivos de favicon em `/public`** — sem dependências; pode ser feito em paralelo com 1 e 2
4. **Componentes base: `Button`, `Input`, `Card`, `Badge`** — depende de 1
5. **Páginas de auth: `login`, `cadastro`, `redefinir-senha`, `nova-senha`** — depende de 1, 4; remoção de `verify/page.tsx`
6. **Callback de auth — adição do param `?next=`** — depende de 5
7. **Componente `Sidebar`** — depende de 1, 4
8. **`BottomNav` redesenhado** — depende de 1, 4
9. **`app/(app)/layout.tsx` atualizado** — depende de 7, 8
10. **Todas as páginas internas redesenhadas** — depende de 9; substituição das classes `blue-*`/`gray-*`
11. **`lib/pdf/template.ts` — atualização de paleta** — depende de 1 (referência aos tokens); independente de 9
12. **Landing page em `app/page.tsx`** — depende de 1, 2, 3, 4; pode ser desenvolvida em paralelo com 9–11

### Technical Dependencies

- **Supabase Auth** — verificar no painel se `signUp` por email está habilitado (pode estar restrito a apenas OTP no projeto atual)
- **Template de email de reset** — verificar se o Supabase tem o template de "Reset Password" configurado ou se usa Resend
- **`profiles` trigger** — confirmar se o campo `name` de `auth.users.raw_user_meta_data` é copiado para `profiles.name` automaticamente no cadastro
- **Usuários sem email** — rodar query `SELECT id FROM auth.users WHERE email IS NULL` antes do deploy para mapear casos especiais de migração

---

## Monitoring and Observability

- **Taxa de erro no login** — logar falhas de `signInWithPassword` com reason (sem expor senha); alertar se > 10% dos logins falharem na primeira semana pós-release (indicativo de problema na migração OTP)
- **Geração de PDF** — log existente em `app/api/quotes/[id]/pdf/route.ts`; verificar se erros de renderização de cor são capturados
- **LCP da landing page** — monitorar via Web Vitals; meta ≤ 2,5s em 4G

---

## Technical Considerations

### Known Risks

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| `signUp` desabilitado no painel Supabase (projeto configurado para só OTP) | Média | Verificar e habilitar antes de qualquer implementação |
| Usuário OTP com telefone como único identificador (sem email) | Baixa | Query em `auth.users` antes do deploy; tratar via suporte manual |
| Overflow em viewport 1024px com sidebar + conteúdo largo | Baixa | Usar `min-w-0` no container filho; testar em 1024px |
| Paleta do PDF com cores residuais azuis em algum trecho do template | Média | Grep por `#2563eb`, `#1e40af`, `#eff6ff`, `#bfdbfe` no template após edição |
| `next/font` com Manrope não disponível offline em CI | Baixa | Configurar `display: swap` e testar com fonte ausente |

---

## Architecture Decision Records

- [ADR-001: Estratégia de Entrega — Uma Release, Três Frentes em Paralelo](adrs/adr-001.md) — Entregar design system, autenticação e landing page em uma única release coesa
- [ADR-002: Substituição de OTP por Email+Senha via Supabase signInWithPassword](adrs/adr-002.md) — `signInWithPassword` + `resetPasswordForEmail` substituem completamente `signInWithOtp`; reset serve como caminho de migração para usuários existentes
- [ADR-003: Tokens de Design via @theme em globals.css (Tailwind v4)](adrs/adr-003.md) — Tokens semânticos de cor e fonte no bloco `@theme` do globals.css, sem arquivo de config separado
- [ADR-004: Layout Responsivo com Sidebar + Bottom Nav no Mesmo Arquivo](adrs/adr-004.md) — Sidebar (`hidden lg:flex`) e BottomNav (`lg:hidden`) coexistem em `app/(app)/layout.tsx` via CSS responsivo
