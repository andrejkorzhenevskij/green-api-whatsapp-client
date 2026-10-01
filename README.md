# GREEN-API Chat

Основа будущего чат-клиента GREEN-API на React + JavaScript, созданная через
официальный шаблон Vite `react`. TypeScript не используется.
Сначала приложение показывает форму авторизации. После ввода `idInstance`
(цифры) и `apiTokenInstance` открывается окно чата. Это локальный демо-режим:
данные не проверяются сервером, UI пока не вызывает GREEN-API.
Сообщения добавляются только на странице. Выход или перезагрузка очищает
данные подключения и переписку.

## Запуск

Требования: Node.js 22.12+ и npm.

Локальный проект находится в `/home/seb/react`. Для запуска:

```bash
cd /home/seb/react
npm install
npm run dev
```

Откройте адрес, который Vite напечатает в терминале — обычно
<http://localhost:5173>. Изменения в `src/` обновляют страницу автоматически.
Остановка сервера: `Ctrl+C`.

## Команды

```bash
npm run lint     # Проверить JavaScript и JSX через Oxlint
npm run check    # Проверить компоненты и API-слой с подменённым fetch
npm run build    # Собрать приложение в dist/
npm run preview  # Локально посмотреть готовую сборку после build
```

Для установки точных версий из `package-lock.json` используйте `npm ci`.

## Структура

```text
react/
├── src/
│   ├── api/
│   │   └── greenApi.js  # Запросы и обработка ошибок GREEN-API
│   ├── components/
│   │   ├── AuthForm.jsx
│   │   ├── ChatWindow.jsx
│   │   ├── MessageList.jsx
│   │   └── MessageInput.jsx
│   ├── App.jsx          # Состояние подключения и переключение экранов
│   ├── main.jsx         # Точка входа React
│   └── index.css        # Стили приложения
├── scripts/check.mjs    # Проверка компонентов и API без дополнительных библиотек
├── index.html
├── vite.config.js
├── .oxlintrc.json
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## API-слой

`src/api/greenApi.js` экспортирует три асинхронные функции:

| Функция | Запрос | Результат |
| --- | --- | --- |
| `sendMessage(idInstance, apiTokenInstance, chatId, message)` | `POST /waInstance{idInstance}/sendMessage/{apiTokenInstance}` с JSON `{chatId, message}` | `{idMessage}` — сообщение принято в очередь, доставка ещё не подтверждена |
| `receiveNotification(idInstance, apiTokenInstance)` | `GET /waInstance{idInstance}/receiveNotification/{apiTokenInstance}?receiveTimeout=5` | `{receiptId, body}` либо `null`, если очередь пуста |
| `deleteNotification(idInstance, apiTokenInstance, receiptId)` | `DELETE /waInstance{idInstance}/deleteNotification/{apiTokenInstance}/{receiptId}` | `{result: true}`; `result: false` вызывает ошибку |

Базовый адрес — `https://api.greenapi.com`, официальный универсальный хост.
GREEN-API рекомендует `apiUrl` конкретного инстанса из личного кабинета;
при переходе на выделенный сервер замените `API_URL` в модуле на этот адрес.
[Рекомендации по хостам](https://green-api.com/en/docs/api/recommendations/using-green-api-hosts/).

`idInstance` и `receiptId` принимаются как положительное безопасное целое число
или строка цифр, `apiTokenInstance` — непустая строка. `chatId` — идентификатор
чата, например `79001234567@c.us` или `120363043968066561@g.us`.
Текст сообщения сохраняет пробелы и переносы; пустой текст и текст длиннее
20000 символов отклоняются до запроса.

Получение — один HTTP long-poll до 5 секунд. Пустое тело ответа также возвращает
`null`. Постоянный опрос не запускается. Общий сетевой таймаут — 15 секунд.
Для HTTP API в настройках инстанса нужно включить нужные уведомления и очистить
`webhookUrl`; модуль не изменяет эти настройки.

Уведомление удаляется **только после успешной обработки** вызывающим кодом:

```js
import { receiveNotification, deleteNotification } from './src/api/greenApi.js'

const notification = await receiveNotification(idInstance, apiTokenInstance)
if (notification !== null) {
  await handleNotification(notification.body) // Ваша обработка или сохранение
  await deleteNotification(idInstance, apiTokenInstance, notification.receiptId)
}
```

Если обработка завершится ошибкой, удаление не выполняется и уведомление
останется в очереди. Сам `receiveNotification` ничего не удаляет.

Сетевые сбои, HTTP-ошибки (с кодом), невалидный JSON, ошибки API и неожиданные
форматы ответа отклоняют Promise с `Error`. Ошибки не содержат URL с токеном
или исходное тело ответа. Автоматических повторов нет, чтобы не дублировать
отправку сообщения. Credentials передаются аргументами, не логируются и не
сохраняются в `localStorage`/`sessionStorage`.

`npm run check` подменяет `fetch`: проверяет методы и адреса, JSON отправки,
пустую очередь, отдельное удаление, валидацию и ошибки. Реальные сообщения
не отправляются. UI остаётся локальным демо; подключение API к компонентам —
следующий этап.

Официальная документация:
[SendMessage](https://green-api.com/docs/api/sending/SendMessage/),
[ReceiveNotification](https://green-api.com/docs/api/receiving/technology-http-api/ReceiveNotification/),
[DeleteNotification](https://green-api.com/docs/api/receiving/technology-http-api/DeleteNotification/).

Токены доступа не добавляйте в исходники или Git. Переменные `VITE_*` доступны
в браузере и не подходят для хранения серверных секретов.
