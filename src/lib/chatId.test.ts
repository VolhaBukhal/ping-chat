import { describe, expect, it } from 'vitest'
import {
  displayChatLabel,
  isSamePersonalChat,
  normalizeChatId,
} from './chatId'

describe('normalizeChatId', () => {
  it('should keep an @ chat id and trim spaces', () => {
    expect(normalizeChatId('  79991234567@c.us  ')).toBe('79991234567@c.us')
  })

  it('should keep a numeric personal chat id and a group id', () => {
    expect(normalizeChatId('10000000')).toBe('10000000')
    expect(normalizeChatId('-10000000000000')).toBe('-10000000000000')
  })

  it('should turn a formatted phone into phone@c.us and keep bare digits', () => {
    expect(normalizeChatId('79991234567')).toBe('79991234567')
    expect(normalizeChatId('+7 999 123-45-67')).toBe('79991234567@c.us')
  })

  it('should reject an empty value and an unknown format', () => {
    expect(() => normalizeChatId('   ')).toThrow(/телефон или chatId/)
    expect(() => normalizeChatId('abc')).toThrow(/Неверный формат/)
  })
})

describe('displayChatLabel', () => {
  it('should show a phone chat as +number', () => {
    expect(displayChatLabel('79991234567@c.us')).toBe('+79991234567')
  })

  it('should show a numeric chat id unchanged', () => {
    expect(displayChatLabel('555001122')).toBe('555001122')
  })
})

describe('isSamePersonalChat', () => {
  it('should match the same chat id', () => {
    expect(
      isSamePersonalChat('555001122', {
        chatId: '555001122',
        chatType: 'user',
      }),
    ).toBe(true)
  })

  it('should match phone@c.us to a user chat with that phone', () => {
    expect(
      isSamePersonalChat('79991234567@c.us', {
        chatId: '555001122',
        chatType: 'user',
        senderPhoneNumber: 79991234567,
      }),
    ).toBe(true)
  })

  it('should reject another personal chat, a group, and a hidden phone', () => {
    expect(
      isSamePersonalChat('555001122', {
        chatId: '888000111',
        chatType: 'user',
        senderPhoneNumber: 70001112233,
      }),
    ).toBe(false)
    expect(
      isSamePersonalChat('79991234567@c.us', {
        chatId: '-100999',
        chatType: 'supergroup',
        senderPhoneNumber: 79991234567,
      }),
    ).toBe(false)
    expect(
      isSamePersonalChat('79991234567@c.us', {
        chatId: '555001122',
        chatType: 'user',
        senderPhoneNumber: 0,
      }),
    ).toBe(false)
  })

  it('should reject a missing chat', () => {
    expect(isSamePersonalChat(null, { chatId: '555001122' })).toBe(false)
    expect(isSamePersonalChat('555001122', undefined)).toBe(false)
  })
})
