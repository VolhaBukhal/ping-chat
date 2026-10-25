import { checkAccount } from '../api/greenApi'
import type { Credentials } from '../types'
import { normalizeChatId } from './chatId'

/**
 * Turn user input into a stable Telegram chatId for send + receive matching.
 * Phones / @username go through CheckAccount so incoming notifications match.
 */
export async function resolveRecipientChatId(
  credentials: Credentials,
  input: string,
): Promise<string> {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('Укажите телефон или chatId получателя')
  }

  if (trimmed.startsWith('@')) {
    const result = await checkAccount(credentials, { username: trimmed })
    if (result.exist && result.chatId) return result.chatId
    throw new Error(
      result.reason || 'Telegram-аккаунт с таким username не найден',
    )
  }

  // Group chatId. A leading minus must win over the phone heuristic,
  // because "-" is also a phone separator.
  if (/^-\d{5,20}$/.test(trimmed)) {
    return trimmed
  }

  // Explicit phone@c.us or formatted phone (+7 999 …)
  const digits = trimmed.replace(/\D/g, '')
  const isPhoneSuffix = trimmed.endsWith('@c.us')
  const isFormattedPhone = /[+\s()-]/.test(trimmed) && digits.length >= 10

  if (isPhoneSuffix || isFormattedPhone) {
    return resolvePhone(credentials, digits)
  }

  // Bare digits: 10–15 → prefer phone CheckAccount; shorter → chatId
  if (/^\d+$/.test(trimmed)) {
    if (digits.length >= 10 && digits.length <= 15) {
      try {
        return await resolvePhone(credentials, digits)
      } catch {
        // May already be a numeric Telegram chatId — keep as-is
        return trimmed
      }
    }
    return trimmed
  }

  return normalizeChatId(trimmed)
}

async function resolvePhone(
  credentials: Credentials,
  digits: string,
): Promise<string> {
  const phoneNumber = Number(digits)
  if (!Number.isFinite(phoneNumber)) {
    throw new Error('Неверный номер телефона')
  }

  const result = await checkAccount(credentials, { phoneNumber })
  if (result.exist && result.chatId) {
    return result.chatId
  }

  // GREEN-API still accepts phone@c.us for SendMessage (compat)
  if (result.exist === false) {
    throw new Error('Telegram-аккаунт на этом номере не найден')
  }

  if (result.reason) {
    throw new Error(result.reason)
  }

  return `${digits}@c.us`
}
