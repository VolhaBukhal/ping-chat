/**
 * Normalize user input to a GREEN-API Telegram chatId.
 * Accepts numeric Telegram chatId, or a phone number (→ phone@c.us).
 * @see https://green-api.com/en/telegram/docs/api/chat-id/
 */
export function normalizeChatId(input: string): string {
  const value = input.trim()
  if (!value) {
    throw new Error('Укажите телефон или chatId получателя')
  }

  if (value.includes('@')) {
    return value
  }

  // Telegram personal/group chatId (digits, optional leading minus)
  if (/^-?\d{5,20}$/.test(value)) {
    return value
  }

  const digits = value.replace(/\D/g, '')
  if (digits.length >= 10 && digits.length <= 15) {
    return `${digits}@c.us`
  }

  throw new Error(
    'Неверный формат. Укажите chatId (например 10000000) или телефон с кодом страны (79991234567).',
  )
}

export function displayChatLabel(chatId: string): string {
  if (chatId.endsWith('@c.us')) {
    return `+${chatId.slice(0, -5)}`
  }
  return chatId
}

type IncomingChat = {
  chatId?: string
  chatType?: string
  senderPhoneNumber?: number
}

/**
 * Personal thread only. Exact chatId match, or phone@c.us against a user
 * chat whose senderPhoneNumber is that phone. Group and channel ids
 * (minus prefix or non-user chatType) never match a personal chat.
 */
export function isSamePersonalChat(
  activeChatId: string | null,
  incoming: IncomingChat | undefined,
): boolean {
  const incomingChatId = incoming?.chatId
  if (!activeChatId || !incomingChatId) return false
  if (incomingChatId === activeChatId) return true

  if (!activeChatId.endsWith('@c.us')) return false
  if (incoming.chatType && incoming.chatType !== 'user') return false
  if (!/^\d{5,20}$/.test(incomingChatId)) return false

  const phone = activeChatId.slice(0, -'@c.us'.length)
  const senderPhone = incoming.senderPhoneNumber
  if (senderPhone == null || senderPhone === 0) return false
  return String(senderPhone) === phone
}
