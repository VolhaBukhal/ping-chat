# ping-chat

[Русский](README.md)

A small React chat that sends and receives **text only** in Telegram via [GREEN-API](https://green-api.com/). Vite + React + TypeScript, CSS Modules. No backend: the browser calls GREEN-API through a Vite proxy. Credentials stay in `sessionStorage` for the current tab.

Requires Node.js `^20.19.0` or `>=22.12.0` and [Yarn](https://yarnpkg.com/).

## Run

```bash
yarn
yarn dev
```

Open http://127.0.0.1:4317. Build with `yarn build`, then `yarn preview` on the same address. Utility unit tests: `yarn test:unit`. UI checks without a real Telegram account: `yarn test:e2e`. Playwright window to watch a run: `yarn test:e2e:open`.

## Telegram instance

1. Create and authorize a **Telegram** instance in the [GREEN-API console](https://console.green-api.com/).
2. Copy `idInstance`, `apiTokenInstance`, and `apiUrl` (usually `https://api.green-api.com`).
3. Leave the webhook URL empty and turn incoming notifications on. Wait about a minute after clearing the webhook, or `receiveNotification` will not return the queue.
4. Enter the values on the login screen. **Log out** clears them. Do not commit them.

## Check

One Telegram account is enough — the one authorized on the instance. Use that phone or `@username` as the recipient. Messages sent from ping-chat land in that account’s Saved Messages. A reply written there shows up in the open chat.

With a second account, use it as the recipient and reply from it.

1. Log in. The chat screen opens. An unauthorized instance shows an error.
2. Enter a phone with country code (`79991234567`), `@username`, or a numeric `chatId`, then open the chat.
3. Send a text. It appears in the thread and in Telegram (Saved Messages, if you wrote to yourself).
4. Reply in Telegram. The reply appears in the open ping-chat thread.

Only one personal chat is open. Groups, media, and stickers are not shown. A `phone@c.us` chat accepts a personal reply from the same phone number, then switches to the numeric `chatId`.

Send: [SendMessage](https://green-api.com/en/telegram/docs/api/sending/SendMessage/). Receive: [HTTP API](https://green-api.com/en/telegram/docs/api/receiving/technology-http-api/) (`receiveNotification`, then `deleteNotification`).

The Vite proxy (`vite.config.ts`) forwards `/green-api/*` using the `X-Green-Api-Url` header. It runs only with `yarn dev` or `yarn preview`.
