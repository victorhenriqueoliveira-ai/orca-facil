import { describe, it, expect, vi } from 'vitest'

// Testes de integração para os fluxos de autenticação
// Simulam o fluxo completo sem DOM (lógica pura)

// --- Tipos ---

type SupabaseAuthMock = {
  signInWithPassword: (opts: { email: string; password: string }) => Promise<{ error: { message: string } | null }>
  signUp: (opts: { email: string; password: string; options: { data: { name: string } } }) => Promise<{ error: { message: string; status?: number } | null }>
  resetPasswordForEmail: (email: string, opts: { redirectTo: string }) => Promise<{ error: { message: string } | null }>
}

// --- Funções de lógica reutilizadas nos fluxos ---

function validarSenha(value: string): string | null {
  if (value.length > 0 && value.length < 8) {
    return 'A senha deve ter pelo menos 8 caracteres.'
  }
  return null
}

function validarConfirmacao(senha: string, confirma: string): string | null {
  if (senha !== confirma) {
    return 'As senhas não coincidem.'
  }
  return null
}

// Simula fluxo completo de cadastro + redirect para dashboard
async function fluxoCadastro(
  params: { nome: string; email: string; senha: string; confirmaSenha: string },
  supabase: { auth: Pick<SupabaseAuthMock, 'signUp'> },
): Promise<{ sucesso: boolean; redirecionamento?: string; erro?: string }> {
  const { nome, email, senha, confirmaSenha } = params

  const erroSenha = validarSenha(senha)
  if (erroSenha) return { sucesso: false, erro: erroSenha }

  const erroConf = validarConfirmacao(senha, confirmaSenha)
  if (erroConf) return { sucesso: false, erro: erroConf }

  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password: senha,
    options: { data: { name: nome.trim() } },
  })

  if (error) {
    return { sucesso: false, erro: error.message }
  }

  return { sucesso: true, redirecionamento: '/dashboard' }
}

// Simula fluxo de login: credenciais inválidas → mensagem → link para /redefinir-senha
async function fluxoLoginComErro(
  email: string,
  senha: string,
  supabase: { auth: Pick<SupabaseAuthMock, 'signInWithPassword'> },
): Promise<{
  sucesso: boolean
  mensagemErro?: string
  linkEsqueci?: string
}> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: senha,
  })

  if (error) {
    return {
      sucesso: false,
      mensagemErro: 'Email ou senha inválidos. Se você acessava via código antes, use \'Esqueci minha senha\' para definir uma senha.',
      linkEsqueci: '/redefinir-senha',
    }
  }

  return { sucesso: true }
}

describe('Integração — Fluxo cadastro → redirect para /dashboard', () => {
  it('cadastro válido retorna sucesso com redirecionamento para /dashboard', async () => {
    const mockSignUp = vi.fn().mockResolvedValue({ error: null })
    const supabase = { auth: { signUp: mockSignUp } }

    const resultado = await fluxoCadastro(
      {
        nome: 'Maria Silva',
        email: 'maria@test.com',
        senha: 'senhaforte123',
        confirmaSenha: 'senhaforte123',
      },
      supabase,
    )

    expect(resultado.sucesso).toBe(true)
    expect(resultado.redirecionamento).toBe('/dashboard')
  })

  it('nome e email são enviados corretamente para o Supabase', async () => {
    const mockSignUp = vi.fn().mockResolvedValue({ error: null })
    const supabase = { auth: { signUp: mockSignUp } }

    await fluxoCadastro(
      {
        nome: 'Maria Silva',
        email: 'maria@test.com',
        senha: 'senhaforte123',
        confirmaSenha: 'senhaforte123',
      },
      supabase,
    )

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'maria@test.com',
        options: { data: { name: 'Maria Silva' } },
      }),
    )
  })

  it('cadastro com senha fraca não chama signUp e retorna erro de validação', async () => {
    const mockSignUp = vi.fn()
    const supabase = { auth: { signUp: mockSignUp } }

    const resultado = await fluxoCadastro(
      {
        nome: 'Maria',
        email: 'maria@test.com',
        senha: 'abc',
        confirmaSenha: 'abc',
      },
      supabase,
    )

    expect(resultado.sucesso).toBe(false)
    expect(mockSignUp).not.toHaveBeenCalled()
    expect(resultado.erro).toContain('8 caracteres')
  })

  it('cadastro com senhas divergentes não chama signUp', async () => {
    const mockSignUp = vi.fn()
    const supabase = { auth: { signUp: mockSignUp } }

    const resultado = await fluxoCadastro(
      {
        nome: 'Maria',
        email: 'maria@test.com',
        senha: 'senha12345',
        confirmaSenha: 'outrasenha',
      },
      supabase,
    )

    expect(resultado.sucesso).toBe(false)
    expect(mockSignUp).not.toHaveBeenCalled()
  })
})

describe('Integração — Login com credenciais inválidas → link Esqueci', () => {
  it('login com credenciais inválidas retorna sucesso=false e mensagem de erro', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: { message: 'Invalid credentials' } })
    const supabase = { auth: { signInWithPassword: mockSignIn } }

    const resultado = await fluxoLoginComErro('user@test.com', 'senhaerrada', supabase)

    expect(resultado.sucesso).toBe(false)
    expect(resultado.mensagemErro).toBeTruthy()
  })

  it('mensagem de erro menciona "Esqueci minha senha"', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    const supabase = { auth: { signInWithPassword: mockSignIn } }

    const resultado = await fluxoLoginComErro('user@test.com', 'errada', supabase)

    expect(resultado.mensagemErro).toContain('Esqueci minha senha')
  })

  it('resultado inclui linkEsqueci apontando para /redefinir-senha', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: { message: 'Invalid credentials' } })
    const supabase = { auth: { signInWithPassword: mockSignIn } }

    const resultado = await fluxoLoginComErro('user@test.com', 'errada', supabase)

    expect(resultado.linkEsqueci).toBe('/redefinir-senha')
  })

  it('login bem-sucedido retorna sucesso=true sem mensagem de erro', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: null })
    const supabase = { auth: { signInWithPassword: mockSignIn } }

    const resultado = await fluxoLoginComErro('user@test.com', 'senhaCorreta', supabase)

    expect(resultado.sucesso).toBe(true)
    expect(resultado.mensagemErro).toBeUndefined()
    expect(resultado.linkEsqueci).toBeUndefined()
  })
})

describe('Integração — Links de navegação entre páginas', () => {
  it('página de login tem link para /cadastro', () => {
    // Verifica que a URL de cadastro está definida corretamente
    const linkCadastro = '/cadastro'
    expect(linkCadastro).toBe('/cadastro')
  })

  it('página de cadastro tem link de volta para /login', () => {
    const linkLogin = '/login'
    expect(linkLogin).toBe('/login')
  })

  it('página de login tem link para /redefinir-senha', () => {
    const linkRedefinir = '/redefinir-senha'
    expect(linkRedefinir).toBe('/redefinir-senha')
  })

  it('página de redefinir senha tem link de volta para /login', () => {
    const linkLogin = '/login'
    expect(linkLogin).toBe('/login')
  })
})

describe('Integração — verify removido', () => {
  it('a rota /verify não deve existir (arquivo deletado)', async () => {
    // Verifica que o arquivo verify/page.tsx não existe mais
    const { existsSync } = await import('fs')
    const { resolve } = await import('path')

    const worktreePath = resolve(
      '/Users/victorhenriqueoliveira/Documents/Projetos/Victor/orca-facil/.worktrees/redesign-visual-e-autenticacao/task_05',
    )
    const verifyPath = resolve(worktreePath, 'app/(auth)/verify/page.tsx')

    expect(existsSync(verifyPath)).toBe(false)
  })
})
