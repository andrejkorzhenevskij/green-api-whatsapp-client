import { useState } from 'react'
import MessageList from './MessageList.jsx'
import MessageInput from './MessageInput.jsx'

export default function ChatWindow({ idInstance, onDisconnect }) {
  const [messages, setMessages] = useState([])

  function addMessage(text) {
    setMessages((current) => [...current, { id: crypto.randomUUID(), text }])
  }

  return (
    <section className="panel" aria-labelledby="chat-title">
      <header className="chat-header">
        <h2 id="chat-title">Чат · {idInstance}</h2>
        <button type="button" className="secondary" onClick={onDisconnect}>
          Выйти
        </button>
      </header>
      <p className="hint">
        API не подключён. Сообщения видны только здесь и исчезнут после выхода
        или обновления страницы.
      </p>
      <MessageList messages={messages} />
      <MessageInput onSend={addMessage} />
    </section>
  )
}
