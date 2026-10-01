import { useState } from 'react'
import AuthForm from './components/AuthForm.jsx'
import ChatWindow from './components/ChatWindow.jsx'

export default function App() {
  const [connection, setConnection] = useState(null)

  return (
    <main className="app">
      <p className="brand">GREEN-API</p>
      <h1>Чат-клиент</h1>
      {connection ? (
        <ChatWindow
          idInstance={connection.idInstance}
          onDisconnect={() => setConnection(null)}
        />
      ) : (
        <AuthForm onConnect={setConnection} />
      )}
    </main>
  )
}
