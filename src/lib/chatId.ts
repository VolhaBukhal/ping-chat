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
