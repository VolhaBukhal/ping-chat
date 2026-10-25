import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearCredentials,
  DEFAULT_API_URL,
  loadCredentials,
  saveCredentials,
} from './credentials'

const store = new Map<string, string>()

describe('credentials', () => {
  beforeEach(() => {
    store.clear()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should save trimmed credentials and load them back', () => {
    saveCredentials({
      idInstance: ' 1101000001 ',
      apiTokenInstance: ' token ',
      apiUrl: 'https://api.green-api.com/',
    })

    expect(loadCredentials()).toEqual({
      idInstance: '1101000001',
      apiTokenInstance: 'token',
      apiUrl: 'https://api.green-api.com',
    })
  })

  it('should use the default api host when it is missing', () => {
    store.set(
      'ping-chat.credentials',
      JSON.stringify({ idInstance: '1', apiTokenInstance: 't' }),
    )

    expect(loadCredentials()?.apiUrl).toBe(DEFAULT_API_URL)
  })

  it('should return null for an empty, broken, or incomplete record', () => {
    expect(loadCredentials()).toBeNull()

    store.set('ping-chat.credentials', '{')
    expect(loadCredentials()).toBeNull()

    store.set(
      'ping-chat.credentials',
      JSON.stringify({ idInstance: '1' }),
    )
    expect(loadCredentials()).toBeNull()
  })

  it('should clear the saved session', () => {
    saveCredentials({
      idInstance: '1',
      apiTokenInstance: 't',
      apiUrl: DEFAULT_API_URL,
    })

    clearCredentials()

    expect(loadCredentials()).toBeNull()
  })
})
