import { useEffect, useRef } from 'react'
import {
  deleteNotification,
  receiveNotification,
} from '../api/greenApi'
import type { ChatMessage, Credentials, IncomingNotification } from '../types'

function extractText(notification: IncomingNotification): string | null {
  const type = notification.messageData?.typeMessage
  if (type === 'textMessage') {
    return notification.messageData?.textMessageData?.textMessage ?? null
  }
  if (type === 'extendedTextMessage') {
    return notification.messageData?.extendedTextMessageData?.text ?? null
  }
  return null
}

type Options = {
  credentials: Credentials | null
  enabled: boolean
  onIncoming: (message: ChatMessage) => void
  onPollError?: (error: string) => void
}

/**
 * Long-poll GREEN-API receiveNotification → show text → deleteNotification.
 * Stops on logout / unmount / disabled.
 *
 * Text incomingMessageReceived is always surfaced. Notifications carry a
 * numeric Telegram chatId, while the open chat is often phone@c.us — an
 * exact match would delete the receipt without showing the message.
 */
export function useReceiveNotifications({
  credentials,
  enabled,
  onIncoming,
  onPollError,
}: Options): void {
  const onIncomingRef = useRef(onIncoming)
  const onPollErrorRef = useRef(onPollError)
  onIncomingRef.current = onIncoming
  onPollErrorRef.current = onPollError

  useEffect(() => {
    if (!credentials || !enabled) return

    const controller = new AbortController()
    let cancelled = false

    const loop = async () => {
      while (!cancelled) {
        try {
          const notification = await receiveNotification(
            credentials,
            20,
            controller.signal,
          )

          if (cancelled) break
          if (!notification) continue

          const { receiptId, body } = notification

          try {
            if (body.typeWebhook === 'incomingMessageReceived') {
              const text = extractText(body)
              const chatId = body.senderData?.chatId
              if (text && chatId) {
                onIncomingRef.current({
                  id: body.idMessage ?? `in-${receiptId}`,
                  chatId,
                  text,
                  direction: 'incoming',
                  timestamp: (body.timestamp || Date.now() / 1000) * 1000,
                })
              }
            }
          } finally {
            await deleteNotification(credentials, receiptId)
          }
        } catch (err) {
          if (cancelled || controller.signal.aborted) break
          const message =
            err instanceof Error ? err.message : 'Ошибка приёма сообщений'
          onPollErrorRef.current?.(message)
          // Back off briefly on errors so we don't spin
          await new Promise((r) => setTimeout(r, 2000))
        }
      }
    }

    void loop()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [credentials, enabled])
}
