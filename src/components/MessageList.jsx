export default function MessageList({ messages }) {
  return (
    <div className="messages" role="log" aria-label="Сообщения" aria-live="polite">
      {messages.length === 0 ? (
        <p className="hint">Сообщений пока нет.</p>
      ) : (
        <ul className="message-list">
          {messages.map((message) => (
            <li className="message" key={message.id}>{message.text}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
