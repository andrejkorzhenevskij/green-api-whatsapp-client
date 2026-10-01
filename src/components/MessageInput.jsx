import { useState } from 'react'

export default function MessageInput({ onSend }) {
  const [text, setText] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const message = text.trim()
    if (!message) return
    onSend(message)
    setText('')
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label htmlFor="message">Сообщение</label>
      <textarea
        id="message"
        name="message"
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
        required
      />
      <button type="submit" disabled={!text.trim()}>Добавить сообщение</button>
    </form>
  )
}
