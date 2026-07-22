import { describe, it, expect, vi } from 'vitest'

// Lógica extraída da página de nova-senha

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

// Simula a lógica do handleSubmit da página nova-senha
async function executarNovaSenha(
  senha: string,
  confirmaSenha: string,
  supabase: {
    auth: {
      updateUser: (opts: { password: string }) => Promise<{ error: { message: string } | null }>
    }
  },
  onSuccess: () => void,
  onError: (msg: string) => void,
  onValidationError: (field: 'senha' | 'confirmacao', msg: string) => void,
) {
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

  const { error } = await supabase.auth.updateUser({ password: senha })

  if (error) {
    onError(error.message)
  } else {
    onSuccess()
  }
}

describe('Nova senha — validação', () => {
  it('senha com menos de 8 caracteres não chama updateUser', async () => {
    const mockUpdate = vi.fn()
    const supabase = { auth: { updateUser: mockUpdate } }

    await executarNovaSenha('curta', 'curta', supabase, vi.fn(), vi.fn(), vi.fn())

    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('senhas divergentes não chamam updateUser', async () => {
    const mockUpdate = vi.fn()
    const supabase = { auth: { updateUser: mockUpdate } }

    await executarNovaSenha('senha12345', 'outrasenha', supabase, vi.fn(), vi.fn(), vi.fn())

    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('senhas divergentes chamam onValidationError com campo "confirmacao"', async () => {
    const mockUpdate = vi.fn()
    const supabase = { auth: { updateUser: mockUpdate } }
    const onValidationError = vi.fn()

    await executarNovaSenha(
      'senha12345',
      'diferente',
      supabase,
      vi.fn(),
      vi.fn(),
      onValidationError,
    )

    expect(onValidationError).toHaveBeenCalledWith('confirmacao', 'As senhas não coincidem.')
  })

  it('senha curta chama onValidationError com campo "senha"', async () => {
    const mockUpdate = vi.fn()
    const supabase = { auth: { updateUser: mockUpdate } }
    const onValidationError = vi.fn()

    await executarNovaSenha('abc', 'abc', supabase, vi.fn(), vi.fn(), onValidationError)

    expect(onValidationError).toHaveBeenCalledWith(
      'senha',
      'A senha deve ter pelo menos 8 caracteres.',
    )
  })
})

describe('Nova senha — chamada à API', () => {
  it('chama updateUser com a nova senha quando válida', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: null })
    const supabase = { auth: { updateUser: mockUpdate } }

    await executarNovaSenha('novasenha123', 'novasenha123', supabase, vi.fn(), vi.fn(), vi.fn())

    expect(mockUpdate).toHaveBeenCalledWith({ password: 'novasenha123' })
  })

  it('chama updateUser apenas uma vez', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: null })
    const supabase = { auth: { updateUser: mockUpdate } }

    await executarNovaSenha('novasenha123', 'novasenha123', supabase, vi.fn(), vi.fn(), vi.fn())

    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })
})

describe('Nova senha — sucesso', () => {
  it('chama onSuccess após atualizar senha com sucesso', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: null })
    const supabase = { auth: { updateUser: mockUpdate } }
    const onSuccess = vi.fn()

    await executarNovaSenha('novasenha123', 'novasenha123', supabase, onSuccess, vi.fn(), vi.fn())

    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('não chama onError quando bem-sucedido', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: null })
    const supabase = { auth: { updateUser: mockUpdate } }
    const onError = vi.fn()

    await executarNovaSenha('novasenha123', 'novasenha123', supabase, vi.fn(), onError, vi.fn())

    expect(onError).not.toHaveBeenCalled()
  })
})

describe('Nova senha — erro da API', () => {
  it('chama onError com a mensagem quando updateUser falha', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: { message: 'Session expired' } })
    const supabase = { auth: { updateUser: mockUpdate } }
    const onError = vi.fn()

    await executarNovaSenha('novasenha123', 'novasenha123', supabase, vi.fn(), onError, vi.fn())

    expect(onError).toHaveBeenCalledWith('Session expired')
  })

  it('não chama onSuccess quando há erro', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: { message: 'Some error' } })
    const supabase = { auth: { updateUser: mockUpdate } }
    const onSuccess = vi.fn()

    await executarNovaSenha('novasenha123', 'novasenha123', supabase, onSuccess, vi.fn(), vi.fn())

    expect(onSuccess).not.toHaveBeenCalled()
  })
})
