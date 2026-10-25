import { useState } from 'react'
import { ChatScreen } from './components/ChatScreen/ChatScreen'
import { LoginForm } from './components/LoginForm/LoginForm'
import { clearCredentials, loadCredentials } from './lib/credentials'
import type { Credentials } from './types'

function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(() =>
    loadCredentials(),
  )

  if (!credentials) {
    return <LoginForm onSuccess={setCredentials} />
  }

  return (
    <ChatScreen
      credentials={credentials}
      onLogout={() => {
        clearCredentials()
        setCredentials(null)
      }}
    />
  )
}

export default App
