import type { Page, Route } from '@playwright/test'

export type MockNotification = {
  receiptId: number
  body: {
    typeWebhook: string
    timestamp: number
    idMessage: string
    senderData: {
      chatId: string
      chatType?: string
      senderPhoneNumber?: number
    }
    messageData: {
      typeMessage: string
      textMessageData?: { textMessage: string }
    }
  }
}

/**
 * Answers browser calls to /green-api so tests never reach Telegram.
 * receiveNotification waits briefly so the app's long poll does not spin.
 */
export class GreenApiMock {
  state: 'authorized' | 'notAuthorized' = 'authorized'
  loginStatus = 200
  loginMessage = 'unauthorized'
  checkAccount: Record<string, unknown> = { exist: true, chatId: '555001122' }
  sendStatus = 200
  sendError = 'Не удалось доставить'
  sent: { chatId: string; message: string }[] = []
  queue: MockNotification[] = []
  /** Head of the queue stays here until deleteNotification, same as GREEN-API. */
  inflight: MockNotification | null = null
  deleted: number[] = []
  /** When set, every receiveNotification fails until cleared. */
  failReceive = false

  async install(page: Page) {
    await page.route('**/green-api/**', (route) => this.handle(page, route))
  }

  pushText(options: {
    receiptId: number
    chatId: string
    text: string
    chatType?: string
    senderPhoneNumber?: number
  }) {
    this.queue.push({
      receiptId: options.receiptId,
      body: {
        typeWebhook: 'incomingMessageReceived',
        timestamp: Math.floor(Date.now() / 1000),
        idMessage: `in-${options.receiptId}`,
        senderData: {
          chatId: options.chatId,
          chatType: options.chatType ?? 'user',
          senderPhoneNumber: options.senderPhoneNumber,
        },
        messageData: {
          typeMessage: 'textMessage',
          textMessageData: { textMessage: options.text },
        },
      },
    })
  }

  private async handle(page: Page, route: Route) {
    const url = route.request().url()
    try {
      if (url.includes('/getStateInstance/')) {
        if (this.loginStatus !== 200) {
          await route.fulfill({
            status: this.loginStatus,
            contentType: 'application/json',
            body: JSON.stringify({ message: this.loginMessage }),
          })
          return
        }
        await route.fulfill({ json: { stateInstance: this.state } })
        return
      }

      if (url.includes('/checkAccount/')) {
        await route.fulfill({ json: this.checkAccount })
        return
      }

      if (url.includes('/sendMessage/')) {
        const body = route.request().postDataJSON() as {
          chatId: string
          message: string
        }
        this.sent.push(body)
        if (this.sendStatus !== 200) {
          await route.fulfill({
            status: this.sendStatus,
            contentType: 'application/json',
            body: JSON.stringify({ message: this.sendError }),
          })
          return
        }
        await route.fulfill({ json: { idMessage: `srv-${this.sent.length}` } })
        return
      }

      if (url.includes('/receiveNotification')) {
        const started = Date.now()
        while (Date.now() - started < 1500) {
          if (page.isClosed()) return
          if (this.failReceive) {
            await route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({ message: 'Очередь недоступна' }),
            })
            return
          }
          if (!this.inflight && this.queue.length > 0) {
            this.inflight = this.queue[0]
          }
          if (this.inflight) {
            await route.fulfill({ json: this.inflight })
            return
          }
          await new Promise((resolve) => setTimeout(resolve, 40))
        }
        if (!page.isClosed()) {
          await route.fulfill({
            contentType: 'application/json',
            body: 'null',
          })
        }
        return
      }

      if (url.includes('/deleteNotification/')) {
        const receiptId = Number(url.split('/').pop()?.split('?')[0])
        this.deleted.push(receiptId)
        if (this.inflight?.receiptId === receiptId) {
          this.inflight = null
          if (this.queue[0]?.receiptId === receiptId) this.queue.shift()
        }
        await route.fulfill({ json: { result: true } })
        return
      }

      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'unmocked' }),
      })
    } catch {
      // The page aborted the long poll (logout or navigation).
    }
  }
}
