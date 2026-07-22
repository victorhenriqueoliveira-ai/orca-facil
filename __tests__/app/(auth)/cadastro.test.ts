import { describe, it, expect, vi } from 'vitest'

// Lógica de validação extraída da página de cadastro

function validarSenha(value: string): string | null {
  if (value.length > 0 && value.length < 8) {
    return 'A senha deve ter pelo menos 8 caracteres.'
  }
  return null
}

function validarConfirmacao(senha: string, confirmaSenha: string): string | null {
  if (senha !== confirmaSenha) {
    return 'As senhas não coincidem.'
  }
  return null
}

function detectarErroEmailEmUso(errorMessage: string, status?: number): boolean {
  return (
    errorMessage.toLowerCase().includes('already registered') ||
    errorMessage.toLowerCase().includes('already in use') ||
    errorMessage.toLowerCase().includes('email already') ||
    status === 422
  )
}

// Simula lógica do handleSubmit da página de cadastro
async function executarCadastro(
  params: { nome: string; email: string; senha: string; confirmaSenha: string },
  supabase: {
    auth: {
      signUp: (opts: {
        email: string
        password: string
        options: { data: { name: string } }
      }) => Promise<{ error: { message: string; status?: number } | null }>
    }
  },
  onSuccess: () => void,
  onError: (msg: string) => void,
  onValidationError: (field: 'senha' | 'confirmacao', msg: string) => void,
) {
  const { nome, email, senha, confirmaSenha } = params

  const erroSenha = validarSenha(senha)
  if (erroSenha) {
    onValidationError('senha', erroSenha)
    return
  }

  const erroConfirmacao = validarConfirmacao(senha, confirmaSenha)
  if (erroConfirmacao) {
    onValidationError('confirmacao', erroConfirmacao)
    return
  }

  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password: senha,
    options: {
      data: {
        name: nome.trim(),
      },
    },
  })

  if (error) {
    if (detectarErroEmailEmUso(error.message, error.status)) {
      onError('Este e-mail já está em uso. Tente fazer login.')
    } else {
      onError(error.message)
    }
  } else {
    onSuccess()
  }
}

describe('Cadastro — validação de senha', () => {
  it('senha com menos de 8 caracteres retorna erro', () => {
    expect(validarSenha('abc')).toBe('A senha deve ter pelo menos 8 caracteres.')
  })

  it('senha com exatamente 7 caracteres retorna erro', () => {
    expect(validarSenha('1234567')).toBe('A senha deve ter pelo menos 8 caracteres.')
  })

  it('senha com exatamente 8 caracteres é válida', () => {
    expect(validarSenha('12345678')).toBeNull()
  })

  it('senha com mais de 8 caracteres é válida', () => {
    expect(validarSenha('minhasenha123')).toBeNull()
  })

  it('senha vazia não retorna erro (campo required cuida disso)', () => {
    expect(validarSenha('')).toBeNull()
  })
})

describe('Cadastro — validação de confirmação de senha', () => {
  it('senhas iguais não retornam erro', () => {
    expect(validarConfirmacao('senha123', 'senha123')).toBeNull()
  })

  it('senhas diferentes retornam erro "As senhas não coincidem."', () => {
    expect(validarConfirmacao('senha123', 'senha456')).toBe('As senhas não coincidem.')
  })

  it('case sensitive: "Senha" e "senha" são diferentes', () => {
    expect(validarConfirmacao('Senha123', 'senha123')).toBe('As senhas não coincidem.')
  })
})

describe('Cadastro — detecção de email em uso', () => {
  it('detecta "already registered" na mensagem', () => {
    expect(detectarErroEmailEmUso('User already registered')).toBe(true)
  })

  it('detecta "already in use" na mensagem', () => {
    expect(detectarErroEmailEmUso('Email already in use')).toBe(true)
  })

  it('detecta "email already" na mensagem', () => {
    expect(detectarErroEmailEmUso('email already exists')).toBe(true)
  })

  it('detecta status 422 como email em uso', () => {
    expect(detectarErroEmailEmUso('error', 422)).toBe(true)
  })

  it('erro genérico não é detectado como email em uso', () => {
    expect(detectarErroEmailEmUso('Internal server error')).toBe(false)
  })
})

describe('Cadastro — validação antes de chamar API', () => {
  it('senha com menos de 8 caracteres não chama signUp', async () => {
    const mockSignUp = vi.fn()
    const supabase = { auth: { signUp: mockSignUp } }

    await executarCadastro(
      { nome: 'João', email: 'joao@test.com', senha: 'curta', confirmaSenha: 'curta' },
      supabase,
      vi.fn(),
      vi.fn(),
      vi.fn(),
    )

    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('senhas divergentes não chamam signUp', async () => {
    const mockSignUp = vi.fn()
    const supabase = { auth: { signUp: mockSignUp } }

    await executarCadastro(
      {
        nome: 'João',
        email: 'joao@test.com',
        senha: 'senha12345',
        confirmaSenha: 'senha67890',
      },
      supabase,
      vi.fn(),
      vi.fn(),
      vi.fn(),
    )

    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('senhas divergentes chamam onValidationError com campo "confirmacao"', async () => {
    const mockSignUp = vi.fn()
    const supabase = { auth: { signUp: mockSignUp } }
    const onValidationError = vi.fn()

    await executarCadastro(
      {
        nome: 'João',
        email: 'joao@test.com',
        senha: 'senha12345',
        confirmaSenha: 'diferente',
      },
      supabase,
      vi.fn(),
      vi.fn(),
      onValidationError,
    )

    expect(onValidationError).toHaveBeenCalledWith('confirmacao', 'As senhas não coincidem.')
  })
})

describe('Cadastro — chamada à API', () => {
  it('chama signUp com email, password e name corretos', async () => {
    const mockSignUp = vi.fn().mockResolvedValue({ error: null })
    const supabase = { auth: { signUp: mockSignUp } }

    await executarCadastro(
      {
        nome: 'João Silva',
        email: 'joao@test.com',
        senha: 'senha12345',
        confirmaSenha: 'senha12345',
      },
      supabase,
      vi.fn(),
      vi.fn(),
      vi.fn(),
    )

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'joao@test.com',
      password: 'senha12345',
      options: { data: { name: 'João Silva' } },
    })
  })
})

describe('Cadastro — email já em uso', () => {
  it('exibe mensagem de email em uso quando Supabase retorna erro de duplicidade', async () => {
    const mockSignUp = vi.fn().mockResolvedValue({
      error: { message: 'User already registered', status: 400 },
    })
    const supabase = { auth: { signUp: mockSignUp } }
    const onError = vi.fn()

    await executarCadastro(
      {
        nome: 'João',
        email: 'existente@test.com',
        senha: 'senha12345',
        confirmaSenha: 'senha12345',
      },
      supabase,
      vi.fn(),
      onError,
      vi.fn(),
    )

    expect(onError).toHaveBeenCalledWith('Este e-mail já está em uso. Tente fazer login.')
  })
})

describe('Cadastro — sucesso', () => {
  it('chama onSuccess após cadastro bem-sucedido', async () => {
    const mockSignUp = vi.fn().mockResolvedValue({ error: null })
    const supabase = { auth: { signUp: mockSignUp } }
    const onSuccess = vi.fn()

    await executarCadastro(
      {
        nome: 'João',
        email: 'novo@test.com',
        senha: 'senha12345',
        confirmaSenha: 'senha12345',
      },
      supabase,
      onSuccess,
      vi.fn(),
      vi.fn(),
    )

    expect(onSuccess).toHaveBeenCalledTimes(1)
  })
})
