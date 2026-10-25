# ping-chat

[English read me](README.en.md)

Минимальный React-чат: отправка и приём **только текста** в Telegram через [GREEN-API](https://green-api.com/).

Стек: Vite + React + TypeScript, стили — CSS Modules. Без бэкенда; запросы к GREEN-API идут через Vite proxy (обход CORS). Credentials только в `sessionStorage`.

Нужны Node.js `^20.19.0` или `>=22.12.0` и [Yarn](https://yarnpkg.com/).

## Запуск локально

```bash
yarn
yarn dev
```

Откройте http://127.0.0.1:4317

Сборка: `yarn build`. Превью собранной версии с тем же proxy: `yarn preview` (тот же адрес).

Unit-тесты утилит: `yarn test:unit`. Проверка интерфейса без реального Telegram: `yarn test:e2e`. Окно Playwright c ui отображением: `yarn test:e2e:open`.

## Подготовка Telegram-инстанса

1. Зарегистрируйтесь в [кабинете GREEN-API](https://console.green-api.com/).
2. Создайте инстанс с типом **Telegram** и авторизуйте его.
3. Скопируйте `idInstance`, `apiTokenInstance` и `apiUrl` (хост из консоли, обычно `https://api.green-api.com`).
4. В настройках инстанса оставьте **webhook URL пустым** и включите входящие уведомления. Иначе `receiveNotification` не отдаст очередь. После очистки webhook подождите около минуты.
5. На экране входа ping-chat введите эти значения. Они сохраняются только в `sessionStorage` текущей вкладки и не коммитятся. «Выйти» очищает их.

## Как проверить

Достаточно одного Telegram-аккаунта — того, которым авторизован инстанс. В поле «Получатель» укажите его же телефон или `@username`. Сообщения, отправленные из ping-chat, попадают в «Избранное» (Saved Messages) этого аккаунта. Ответ, написанный там же, приходит обратно в открытый чат.

Если есть второй аккаунт, укажите его получателем и ответьте уже с него.

1. Запустите приложение и войдите. Экран сменится на чат. Если инстанс не авторизован, форма покажет ошибку.
2. В поле «Получатель» укажите телефон с кодом страны (`79991234567`), `@username` или числовой `chatId`. Нажмите «Открыть чат».
3. Напишите текст и отправьте. Сообщение появляется в ленте и в Telegram: у другого получателя в обычном чате, у своего аккаунта — в «Избранном».
4. Ответьте текстом из Telegram. Ответ появляется в открытом чате ping-chat.

Открыт один личный чат. Группы, медиа и стикеры в ленту не попадают. Пока чат записан как `phone@c.us`, в него попадёт личный ответ с тем же номером телефона; после этого чат переключается на числовой `chatId`.

Отправка: [SendMessage](https://green-api.com/en/telegram/docs/api/sending/SendMessage/). Приём: [HTTP API](https://green-api.com/en/telegram/docs/api/receiving/technology-http-api/) (`receiveNotification` → показ текста → `deleteNotification`).

## CORS / proxy

Браузер не ходит на GREEN-API напрямую: Vite проксирует `/green-api/*` на хост из заголовка `X-Green-Api-Url` (по умолчанию `https://api.green-api.com`). См. `vite.config.ts`. Прокси есть только пока запущены `yarn dev` или `yarn preview`.
