// ponytail: универсальный хост; для выделенного сервера заменить на apiUrl инстанса.
const API_URL = 'https://api.greenapi.com'

function isPositiveInteger(value) {
  return (typeof value === 'string' && /^[1-9]\d*$/.test(value)) ||
    (Number.isSafeInteger(value) && value > 0)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

async function request(idInstance, apiTokenInstance, method, httpMethod, suffix = '', body) {
  if (!isPositiveInteger(idInstance)) {
    throw new Error('idInstance должен быть положительным целым числом.')
  }
  if (!isNonEmptyString(apiTokenInstance)) {
    throw new Error('apiTokenInstance обязателен.')
  }

  const url = `${API_URL}/waInstance${idInstance}/${method}/${encodeURIComponent(apiTokenInstance.trim())}${suffix}`
  let response
  let text
  try {
    response = await fetch(url, {
      method: httpMethod,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      credentials: 'omit',
      signal: AbortSignal.timeout(15000),
    })
    if (response.ok) text = await response.text()
  } catch {
    // Ошибки fetch могут содержать URL с токеном: не передаём их наружу.
    throw new Error(`GREEN-API ${method}: ошибка сети или таймаут.`)
  }

  if (!response.ok) {
    throw new Error(`GREEN-API ${method}: HTTP ${response.status}.`)
  }

  let data
  try {
    data = text.trim() ? JSON.parse(text) : null
  } catch {
    throw new Error(`GREEN-API ${method}: некорректный JSON в ответе.`)
  }
  if (data?.status === 'error' || data?.error || data?.errorCode) {
    // Не включаем тело ответа: сервер может вернуть в нём credentials.
    throw new Error(`GREEN-API ${method}: API вернул ошибку.`)
  }
  return data
}

export async function sendMessage(idInstance, apiTokenInstance, chatId, message) {
  if (!isNonEmptyString(chatId)) throw new Error('chatId обязателен.')
  if (!isNonEmptyString(message) || message.length > 20000) {
    throw new Error('message должен содержать от 1 до 20000 символов, не только пробелы.')
  }

  const data = await request(idInstance, apiTokenInstance, 'sendMessage', 'POST', '', {
    chatId: chatId.trim(),
    message,
  })
  if (!isNonEmptyString(data?.idMessage)) {
    throw new Error('GREEN-API sendMessage: в ответе отсутствует idMessage.')
  }
  return data
}

// Один long-poll (до 5 секунд). Подтверждение выполняется отдельно после обработки.
export async function receiveNotification(idInstance, apiTokenInstance) {
  const data = await request(
    idInstance, apiTokenInstance, 'receiveNotification', 'GET', '?receiveTimeout=5',
  )
  if (data === null) return null
  if (!Number.isSafeInteger(data?.receiptId) || data.receiptId <= 0 ||
      !data.body || typeof data.body !== 'object' || Array.isArray(data.body)) {
    throw new Error('GREEN-API receiveNotification: некорректные receiptId или body.')
  }
  return data
}

export async function deleteNotification(idInstance, apiTokenInstance, receiptId) {
  if (!isPositiveInteger(receiptId)) {
    throw new Error('receiptId должен быть положительным целым числом.')
  }
  const data = await request(
    idInstance, apiTokenInstance, 'deleteNotification', 'DELETE', `/${receiptId}`,
  )
  if (data?.result === false) {
    throw new Error('GREEN-API deleteNotification: уведомление не удалено (result: false).')
  }
  if (data?.result !== true) {
    throw new Error('GREEN-API deleteNotification: некорректный результат удаления.')
  }
  return data
}
