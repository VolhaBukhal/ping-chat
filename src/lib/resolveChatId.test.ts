import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkAccount } from '../api/greenApi'
import { resolveRecipientChatId } from './resolveChatId'

vi.mock('../api/greenApi', () => ({
  checkAccount: vi.fn(),
}))

const credentials = {
  idInstance: '1101000001',
  apiTokenInstance: 'token',
  apiUrl: 'https://api.green-api.com',
}

const mockedCheck = vi.mocked(checkAccount)

describe('resolveRecipientChatId', () => {
  beforeEach(() => {
    mockedCheck.mockReset()
  })

  it('should reject an empty recipient', async () => {
    await expect(resolveRecipientChatId(credentials, '  ')).rejects.toThrow(
      /телефон или chatId/,
    )
    expect(mockedCheck).not.toHaveBeenCalled()
  })

  it('should resolve @username through CheckAccount', async () => {
    mockedCheck.mockResolvedValue({ exist: true, chatId: '777000111' })

    await expect(resolveRecipientChatId(credentials, '@vasilisa')).resolves.toBe(
      '777000111',
    )
    expect(mockedCheck).toHaveBeenCalledWith(credentials, {
      username: '@vasilisa',
    })
  })

  it('should report a missing username', async () => {
    mockedCheck.mockResolvedValue({ exist: false, reason: 'not found' })

    await expect(resolveRecipientChatId(credentials, '@missing')).rejects.toThrow(
      'not found',
    )
  })

  it('should use the numeric chat id from a formatted phone', async () => {
    mockedCheck.mockResolvedValue({ exist: true, chatId: '555001122' })

    await expect(
      resolveRecipientChatId(credentials, '+7 999 123-45-67'),
    ).resolves.toBe('555001122')
  })

  it('should fall back to phone@c.us when the account exists without a chat id', async () => {
    mockedCheck.mockResolvedValue({ exist: true })

    await expect(
      resolveRecipientChatId(credentials, '79991234567@c.us'),
    ).resolves.toBe('79991234567@c.us')
  })

  it('should reject a formatted phone with no Telegram account', async () => {
    mockedCheck.mockResolvedValue({ exist: false })

    await expect(
      resolveRecipientChatId(credentials, '+79990001122'),
    ).rejects.toThrow('Telegram-аккаунт на этом номере не найден')
  })

  it('should keep bare digits when CheckAccount fails', async () => {
    mockedCheck.mockRejectedValue(new Error('network'))

    await expect(resolveRecipientChatId(credentials, '79991234567')).resolves.toBe(
      '79991234567',
    )
  })

  it('should keep a short chat id and a group id without CheckAccount', async () => {
    await expect(resolveRecipientChatId(credentials, '10000000')).resolves.toBe(
      '10000000',
    )
    await expect(
      resolveRecipientChatId(credentials, '-10000000000000'),
    ).resolves.toBe('-10000000000000')
    expect(mockedCheck).not.toHaveBeenCalled()
  })

  it('should reject an unknown format', async () => {
    await expect(resolveRecipientChatId(credentials, 'abc')).rejects.toThrow(
      /Неверный формат/,
    )
  })
})
