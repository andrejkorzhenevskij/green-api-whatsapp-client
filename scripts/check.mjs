import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { sendMessage, receiveNotification, deleteNotification } from '../src/api/greenApi.js'

const server = await createServer({ server: { middlewareMode: true } })
try {
  const { default: App } = await server.ssrLoadModule('/src/App.jsx')
  const { default: ChatWindow } = await server.ssrLoadModule('/src/components/ChatWindow.jsx')
  const { default: MessageList } = await server.ssrLoadModule('/src/components/MessageList.jsx')

  const auth = renderToStaticMarkup(createElement(App))
  assert.match(auth, /name="idInstance"/)
  assert.match(auth, /type="password"/)
  assert.match(auth, /<button[^>]*disabled/)
  assert.doesNotMatch(auth, /role="log"/)

  const chat = renderToStaticMarkup(createElement(ChatWindow, { idInstance: '123' }))
  assert.match(chat, /Чат · 123/)
  assert.match(chat, /Сообщений пока нет/)
  assert.match(chat, /name="message"/)
  assert.match(chat, /<button type="submit" disabled/)

  const messages = renderToStaticMarkup(createElement(MessageList, {
    messages: [{ id: '1', text: '<script>alert("test")</script>' }],
  }))
  assert.match(messages, /&lt;script&gt;/)
  assert.doesNotMatch(messages, /<script>/)
  console.log('Component checks passed: auth, empty chat, input, safe message text.')
} finally {
  await server.close()
}

// Все API-запросы подменяются: настоящие credentials и доступ к GREEN-API не нужны.
const originalFetch = globalThis.fetch
const calls = []
const idInstance = '1101000001'
const token = 'test-token/not-a-secret'
const base = `https://api.greenapi.com/waInstance${idInstance}`
let reply = () => new Response('null')
globalThis.fetch = async (url, options) => {
  calls.push({ url, options })
  return reply()
}
const respond = (body, status = 200) => {
  reply = () => new Response(body, { status })
}
const send = () => sendMessage(idInstance, token, '79001234567@c.us', '  Привет! 😃\n ')
const receive = () => receiveNotification(idInstance, token)
const remove = () => deleteNotification(idInstance, token, 123)

try {
  respond('{"idMessage":"message-1"}')
  assert.deepEqual(await send(), { idMessage: 'message-1' })
  assert.equal(calls[0].url, `${base}/sendMessage/${encodeURIComponent(token)}`)
  assert.equal(calls[0].options.method, 'POST')
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json')
  assert.equal(calls[0].options.cache, 'no-store')
  assert.equal(calls[0].options.credentials, 'omit')
  assert.ok(calls[0].options.signal instanceof AbortSignal)
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    chatId: '79001234567@c.us', message: '  Привет! 😃\n ',
  })

  for (const empty of ['null', '', '  ']) {
    respond(empty)
    const before = calls.length
    assert.equal(await receive(), null)
    assert.equal(calls.length, before + 1)
    assert.equal(calls.at(-1).url, `${base}/receiveNotification/${encodeURIComponent(token)}?receiveTimeout=5`)
    assert.equal(calls.at(-1).options.method, 'GET')
    assert.equal(calls.at(-1).options.body, undefined)
  }

  // Даже событие об ошибке внутри body — уведомление, а не ошибка самого запроса.
  const notification = { receiptId: 123, body: { typeWebhook: 'incomingMessageReceived', message: 'hi', error: 'event data' } }
  respond(JSON.stringify(notification))
  const beforeReceive = calls.length
  assert.deepEqual(await receive(), notification)
  assert.equal(calls.length, beforeReceive + 1, 'Receiving must not delete before processing')
  respond('{"result":true}')
  assert.deepEqual(await remove(), { result: true })
  assert.equal(calls.at(-1).url, `${base}/deleteNotification/${encodeURIComponent(token)}/123`)
  assert.equal(calls.at(-1).options.method, 'DELETE')
  assert.equal(calls.at(-1).options.body, undefined)

  for (const action of [send, receive, remove]) {
    for (const status of [400, 401, 403, 429, 500]) {
      respond(`<html>${token}</html>`, status)
      await assert.rejects(action, new RegExp(`HTTP ${status}`))
    }
    respond(`invalid json ${token}`)
    await assert.rejects(action, /некорректный JSON/)
    for (const error of [{ status: 'error', code: 'INVALID_PARAM', message: token }, { error: token }]) {
      respond(JSON.stringify(error))
      await assert.rejects(action, (error) => {
        assert.match(error.message, /API вернул ошибку/)
        assert.ok(!String(error).includes(token))
        assert.equal(error.cause, undefined)
        return true
      })
    }
    for (const body of ['{}', '[]', 'true']) {
      respond(body)
      await assert.rejects(action)
    }
    reply = () => { throw new TypeError(`Failed to fetch ${base}/${token}`) }
    const before = calls.length
    await assert.rejects(action, (error) => {
      assert.match(error.message, /ошибка сети или таймаут/)
      assert.ok(!String(error).includes(token))
      assert.equal(error.cause, undefined)
      return true
    })
    assert.equal(calls.length, before + 1, 'No automatic retries')
  }
  for (const receiptId of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '123']) {
    respond(JSON.stringify({ receiptId, body: {} }))
    await assert.rejects(receive, /receiptId или body/)
  }
  respond('{"receiptId":123,"body":null}')
  await assert.rejects(receive, /receiptId или body/)
  respond('{"result":false}')
  await assert.rejects(remove, /result: false/)
  respond('null')
  await assert.rejects(send, /idMessage/)
  await assert.rejects(remove, /результат удаления/)

  const beforeValidation = calls.length
  await assert.rejects(() => sendMessage(idInstance, token, '', 'hi'), /chatId/)
  for (const message of ['', '   ', 'x'.repeat(20001)]) {
    await assert.rejects(() => sendMessage(idInstance, token, 'chat@c.us', message), /message/)
  }
  await assert.rejects(() => receiveNotification('../bad', token), /idInstance/)
  await assert.rejects(() => receiveNotification(idInstance, ' '), /apiTokenInstance/)
  await assert.rejects(() => deleteNotification(idInstance, token, '../bad'), /receiptId/)
  assert.equal(calls.length, beforeValidation, 'Invalid input must not reach fetch')
  console.log('API checks passed: requests, notifications, validation, HTTP/JSON/API/network errors.')
} finally {
  globalThis.fetch = originalFetch
}
