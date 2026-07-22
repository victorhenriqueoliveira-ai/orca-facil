import { describe, it, expect, vi } from 'vitest'

// Lógica extraída da página de redefinir senha

async function executarResetSenha(
  email: string,
  origin: string,
  supabase: {
    auth: {
      resetPasswordForEmail: (
        email: string,
        opts: { redirectTo: string }
      ) => Promise<{ error: { message: string } | null }>
    }
  },
  onSuccess: () => void,
  onError: (msg: string) => void,
) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${origin}/api/auth/callback?next=/nova-senha`,
  })

  if (error) {
    onError(error.message)
  } else {
    onSuccess()
  }
}

describe('Redefinir senha — chamada à API', () => {
  it('chama resetPasswordForEmail com email correto', async () => {
    const mockReset = vi.fn().mockResolvedValue({ error: null })
    const supabase = { auth: { resetPasswordForEmail: mockReset } }

    await executarResetSenha(
      'user@test.com',
      'https://orca.app',
      supabase,
      vi.fn(),
      vi.fn(),
    )

    expect(mockReset).toHaveBeenCalledWith(
      'user@test.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('/api/auth/callback') }),
    )
  })

  it('redirectTo contém /nova-senha no parâmetro next', async () => {
    const mockReset = vi.fn().mockResolvedValue({ error: null })
    const supabase = { auth: { resetPasswordForEmail: mockReset } }

    await executarResetSenha(
      'user@test.com',
      'https://orca.app',
      supabase,
      vi.fn(),
      vi.fn(),
    )

    const chamada = mockReset.mock.calls[0]
    expect(chamada[1].redirectTo).toContain('/nova-senha')
  })

  it('redirectTo usa a origin fornecida', async () => {
    const mockReset = vi.fn().mockResolvedValue({ error: null })
    const supabase = { auth: { resetPasswordForEmail: mockReset } }

    await executarResetSenha(
      'user@test.com',
      'https://meuapp.com',
      supabase,
      vi.fn(),
      vi.fn(),
    )

    const chamada = mockReset.mock.calls[0]
    expect(chamada[1].redirectTo).toContain('https://meuapp.com')
  })

  it('email com espaços é trimado antes de chamar a API', async () => {
    const mockReset = vi.fn().mockResolvedValue({ error: null })
    const supabase = { auth: { resetPasswordForEmail: mockReset } }

    await executarResetSenha(
      '  user@test.com  ',
      'https://orca.app',
      supabase,
      vi.fn(),
      vi.fn(),
    )

    expect(mockReset).toHaveBeenCalledWith('user@test.com', expect.anything())
  })
})

describe('Redefinir senha — sucesso', () => {
  it('chama onSuccess após envio bem-sucedido', async () => {
    const mockReset = vi.fn().mockResolvedValue({ error: null })
    const supabase = { auth: { resetPasswordForEmail: mockReset } }
    const onSuccess = vi.fn()

    await executarResetSenha('user@test.com', 'https://orca.app', supabase, onSuccess, vi.fn())

    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('não chama onError em caso de sucesso', async () => {
    const mockReset = vi.fn().mockResolvedValue({ error: null })
    const supabase = { auth: { resetPasswordForEmail: mockReset } }
    const onError = vi.fn()

    await executarResetSenha('user@test.com', 'https://orca.app', supabase, vi.fn(), onError)

    expect(onError).not.toHaveBeenCalled()
  })
})

describe('Redefinir senha — erro', () => {
  it('chama onError com a mensagem do erro quando falha', async () => {
    const mockReset = vi.fn().mockResolvedValue({ error: { message: 'Rate limit exceeded' } })
    const supabase = { auth: { resetPasswordForEmail: mockReset } }
    const onError = vi.fn()

    await executarResetSenha('user@test.com', 'https://orca.app', supabase, vi.fn(), onError)

    expect(onError).toHaveBeenCalledWith('Rate limit exceeded')
  })

  it('não chama onSuccess quando há erro', async () => {
    const mockReset = vi.fn().mockResolvedValue({ error: { message: 'Some error' } })
    const supabase = { auth: { resetPasswordForEmail: mockReset } }
    const onSuccess = vi.fn()

    await executarResetSenha('user@test.com', 'https://orca.app', supabase, onSuccess, vi.fn())

    expect(onSuccess).not.toHaveBeenCalled()
  })
})
