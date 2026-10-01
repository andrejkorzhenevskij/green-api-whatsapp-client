import { useState } from 'react'

export default function AuthForm({ onConnect }) {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const credentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
    }
    if (!/^\d+$/.test(credentials.idInstance) || !credentials.apiTokenInstance) return
    onConnect(credentials)
  }

  return (
    <section className="panel" aria-labelledby="auth-title">
      <h2 id="auth-title">Авторизация</h2>
      <p className="hint">
        Демо-режим: API не подключён, данные не проверяются сервером
        и хранятся только в памяти этой страницы.
      </p>
      <form className="form" onSubmit={handleSubmit}>
        <label htmlFor="id-instance">idInstance</label>
        <input
          id="id-instance"
          name="idInstance"
          value={idInstance}
          onChange={(event) => setIdInstance(event.target.value)}
          inputMode="numeric"
          pattern="[0-9]+"
          title="Введите идентификатор из цифр"
          autoComplete="off"
          required
        />
        <label htmlFor="api-token-instance">apiTokenInstance</label>
        <input
          id="api-token-instance"
          name="apiTokenInstance"
          type="password"
          value={apiTokenInstance}
          onChange={(event) => setApiTokenInstance(event.target.value)}
          autoComplete="off"
          required
        />
        <button type="submit" disabled={!idInstance.trim() || !apiTokenInstance.trim()}>
          Открыть чат
        </button>
      </form>
    </section>
  )
}
