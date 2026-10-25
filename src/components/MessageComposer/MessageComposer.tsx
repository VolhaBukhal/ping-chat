import { type FormEvent, type KeyboardEvent, useState } from 'react'
import styles from './MessageComposer.module.css'

type Props = {
  disabled?: boolean
  sending?: boolean
  onSend: (text: string) => Promise<void> | void
}

export function MessageComposer({ disabled, sending, onSend }: Props) {
  const [text, setText] = useState('')

  const canSend = text.trim().length > 0 && !disabled && !sending

  const submit = async () => {
    const value = text.trim()
    if (!value || disabled || sending) return
    setText('')
    await onSend(value)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void submit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <textarea
        className={styles.input}
        rows={1}
        placeholder="Сообщение"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label="Текст сообщения"
      />
      <button
        className={styles.send}
        type="submit"
        data-test-id="send-message"
        disabled={!canSend}
        aria-label="Отправить"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3.4 11.2 20.1 3.7c.7-.3 1.4.4 1.1 1.1l-7.5 16.7c-.3.7-1.3.6-1.5-.1l-1.8-5.6a1 1 0 0 0-.6-.6l-5.6-1.8c-.7-.2-.8-1.2-.1-1.5Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </form>
  )
}
