import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../../types'
import styles from './MessageList.module.css'

type Props = {
  messages: ChatMessage[]
  emptyHint?: string
}

function formatTime(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts))
}

export function MessageList({ messages, emptyHint }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>Нет сообщений</div>
          <p className={styles.emptyText}>
            {emptyHint ??
              'Напишите первое сообщение — оно уйдёт в Telegram через GREEN-API.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap} role="log" aria-live="polite">
      {messages.map((message) => {
        const isOut = message.direction === 'outgoing'
        return (
          <div
            key={message.id}
            className={`${styles.row} ${isOut ? styles.rowOut : styles.rowIn}`}
          >
            <div
              className={`${styles.bubble} ${isOut ? styles.out : styles.in} ${
                message.status === 'failed' ? styles.failed : ''
              }`}
            >
              {message.text}
              <div className={styles.meta}>
                {message.status === 'sending' ? <span>отправка…</span> : null}
                {message.status === 'failed' ? (
                  <span className={styles.statusFail} title={message.error}>
                    ошибка
                  </span>
                ) : null}
                <span>{formatTime(message.timestamp)}</span>
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
