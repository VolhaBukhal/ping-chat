import { type FormEvent, useCallback, useMemo, useState } from 'react'
import { GreenApiError, sendMessage } from '../../api/greenApi'
import { useReceiveNotifications } from '../../hooks/useReceiveNotifications'
import { displayChatLabel } from '../../lib/chatId'
import { resolveRecipientChatId } from '../../lib/resolveChatId'
import type { ChatMessage, Credentials } from '../../types'
import { MessageComposer } from '../MessageComposer/MessageComposer'
import { MessageList } from '../MessageList/MessageList'
import styles from './ChatScreen.module.css'

type Props = {
  credentials: Credentials
  onLogout: () => void
}

export function ChatScreen({ credentials, onLogout }: Props) {
  const [recipientInput, setRecipientInput] = useState('')
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [opening, setOpening] = useState(false)
  const [mobileShowChat, setMobileShowChat] = useState(false)

  const chatMessages = useMemo(
    () => (activeChatId ? messages : []),
    [messages, activeChatId],
  )

  const handleIncoming = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev
      return [...prev, message]
    })
    setPollError(null)
    setActiveChatId((current) => {
      if (!current || current.endsWith('@c.us')) return message.chatId
      return current
    })
  }, [])

  useReceiveNotifications({
    credentials,
    enabled: true,
    onIncoming: handleIncoming,
    onPollError: (error) => setPollError(error),
  })

  const openChat = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setOpening(true)
    try {
      const chatId = await resolveRecipientChatId(credentials, recipientInput)
      setActiveChatId(chatId)
      setMobileShowChat(true)
      setRecipientInput('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Неверный получатель')
    } finally {
      setOpening(false)
    }
  }

  const handleSend = async (text: string) => {
    if (!activeChatId) return

    const tempId = `local-${Date.now()}`
    const optimistic: ChatMessage = {
      id: tempId,
      chatId: activeChatId,
      text,
      direction: 'outgoing',
      timestamp: Date.now(),
      status: 'sending',
    }

    setMessages((prev) => [...prev, optimistic])
    setSending(true)

    try {
      const result = await sendMessage(credentials, activeChatId, text)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: result.idMessage || tempId, status: 'sent' }
            : m,
        ),
      )
    } catch (err) {
      const message =
        err instanceof GreenApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Не удалось отправить'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, status: 'failed', error: message } : m,
        ),
      )
    } finally {
      setSending(false)
    }
  }

  const shellClass = [
    styles.shell,
    mobileShowChat && activeChatId ? styles.shellChatOpen : styles.shellList,
  ].join(' ')

  return (
    <div className={shellClass}>
      <aside className={styles.sidebar}>
        <div className={styles.sideHeader}>
          <div className={styles.brand}>ping-chat</div>
          <button type="button" className={styles.logout} onClick={onLogout}>
            Выйти
          </button>
        </div>

        <div className={styles.sideBody}>
          <div className={styles.sideLabel}>Новый чат</div>
          <form className={styles.newChat} onSubmit={openChat}>
            <input
              className={styles.input}
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              placeholder="Телефон или chatId"
              aria-label="Получатель"
            />
            <button
              className={styles.startBtn}
              type="submit"
              disabled={!recipientInput.trim() || opening}
            >
              {opening ? 'Ищем…' : 'Открыть чат'}
            </button>
          </form>
          <p className={styles.hint}>
            Telegram: chatId (10000000) или телефон с кодом страны
            (79991234567). Группы вне MVP.
          </p>
          {formError ? (
            <div className={styles.error} role="alert">
              {formError}
            </div>
          ) : null}

          {activeChatId ? (
            <>
              <div className={styles.sideLabel}>Чаты</div>
              <button
                type="button"
                className={`${styles.chatItem} ${styles.chatItemActive}`}
                onClick={() => setMobileShowChat(true)}
              >
                <span className={styles.chatItemTitle}>
                  {displayChatLabel(activeChatId)}
                </span>
                <span className={styles.chatItemMeta}>Telegram · GREEN-API</span>
              </button>
            </>
          ) : null}
        </div>
      </aside>

      <main className={styles.main}>
        {activeChatId ? (
          <>
            <header className={styles.topBar}>
              <button
                type="button"
                className={styles.back}
                onClick={() => setMobileShowChat(false)}
              >
                ← Чаты
              </button>
              <div className={styles.peer}>
                <div className={styles.peerName}>
                  {displayChatLabel(activeChatId)}
                </div>
                <div className={styles.peerStatus}>
                  {sending ? 'Отправка…' : 'онлайн через GREEN-API'}
                </div>
              </div>
            </header>

            {pollError ? (
              <div className={styles.pollBanner} role="status">
                Приём: {pollError}
              </div>
            ) : null}

            <MessageList messages={chatMessages} />
            <MessageComposer
              onSend={handleSend}
              sending={sending}
              disabled={!activeChatId}
            />
          </>
        ) : (
          <div className={styles.blank}>
            <div className={styles.blankTitle}>Выберите собеседника</div>
            <p>
              Введите телефон или chatId слева, чтобы начать текстовый чат в
              Telegram.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
